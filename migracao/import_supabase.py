"""Importa administradoras, clientes e vínculos (CSVs do export_sqlserver.py) para o Supabase do portal.

Dry-run por padrão: valida os CSVs, classifica os clientes e grava uma prévia local, sem conectar.
Com --apply, grava tudo em UMA transação (qualquer erro desfaz tudo) e só no projeto do portal.
Reexecutar é seguro: registros e vínculos já existentes não são duplicados nem sobrescritos.
"""
import argparse
import csv
import json
import os
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlparse

SOURCE = "portamovel_sqlserver_2026_11_04"
PORTAL_PROJECT = "rluzszruexjxkgrylvjd"
FORBIDDEN_PROJECTS = {"fbzkhxfcsxkqrpqfitwr"}  # site institucional: nunca importar lá
CONFIRMATION = "I_UNDERSTAND_THIS_UPLOADS_REAL_CUSTOMER_DATA"
KINDS = {"unclassified", "condominium", "business", "person"}

CONDO = re.compile(r"^(COND\b|CONDOMINIO|EDIFICIO|EDIF\b|ED\b|RESIDENCIAL|RES\b|CONJUNTO RESIDENCIAL)|\bCONDOMINIO\b")
BUSINESS = re.compile(r"\b(LTDA|EIRELI|EPP|S ?A|S/A|MEI|COMERCIO|INDUSTRIA|SERVICOS|HOTEL|IGREJA|ESCOLA|CLINICA|HOSPITAL)\b")


def norm(text):
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9/ ]", " ", text.upper())).strip()


def guess_kind(row):
    names = f"{norm(row.get('trade_name'))} | {norm(row.get('legal_name'))}"
    if any(CONDO.search(part) for part in names.split(" | ")):
        return "condominium"
    if BUSINESS.search(names):
        return "business"
    return "unclassified"


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(stream)]


def classify(customers, overrides, enabled):
    stats = {k: 0 for k in sorted(KINDS)}
    for row in customers:
        kind = overrides.get(row["legacy_code"]) or row.get("customer_kind") or "unclassified"
        if kind == "unclassified" and enabled and row["legacy_code"] not in overrides:
            kind = guess_kind(row)
        if kind not in KINDS:
            raise ValueError(f"Tipo inválido '{kind}' para o cliente {row['legacy_code']}")
        row["customer_kind"] = kind
        stats[kind] += 1
    return stats


def validate(admins, customers):
    for label, rows in (("administradoras", admins), ("clientes", customers)):
        codes = [r["legacy_code"] for r in rows]
        if not all(codes):
            raise ValueError(f"{label}: há linha sem código legado. Corrija a exportação.")
        if len(set(codes)) != len(codes):
            raise ValueError(f"{label}: códigos legados duplicados.")
        short = [r["legacy_code"] for r in rows if len(r["trade_name"]) < 2]
        if short:
            raise ValueError(f"{label}: nome com menos de 2 caracteres nos códigos {short[:10]}")
    admin_codes = {r["legacy_code"] for r in admins}
    links = [r for r in customers if r["manager_legacy_code"]]
    orphans = [r["legacy_code"] for r in links if r["manager_legacy_code"] not in admin_codes]
    return {"administradoras": len(admins), "clientes": len(customers),
            "vinculos_previstos": len(links) - len(orphans), "vinculos_orfaos": len(orphans),
            "clientes_sem_administradora": len(customers) - len(links)}


def check_target(db_url, allow_local):
    url = urlparse(db_url)
    where = f"{url.hostname or ''} {url.username or ''}"
    if any(ref in db_url for ref in FORBIDDEN_PROJECTS):
        raise SystemExit("BLOQUEADO: a URL aponta para o projeto do site institucional.")
    if allow_local and url.hostname in {"localhost", "127.0.0.1"}:
        return
    if PORTAL_PROJECT not in where:
        raise SystemExit(f"BLOQUEADO: a URL não é do projeto do portal ({PORTAL_PROJECT}).")


def apply(cur, admins, customers):
    out = {}
    cols = "legacy_code,trade_name,legal_name,cnpj,email,phone,address_text,legacy_status"
    params = lambda r, extra=(): (SOURCE, *[r.get(c) or None for c in cols.split(",")], *extra)
    cur.execute("select count(*) from public.management_companies where legacy_source=%s", (SOURCE,))
    before = cur.fetchone()[0]
    cur.executemany(f"""insert into public.management_companies (legacy_source,{cols})
        values (%s,%s,%s,%s,%s,%s,%s,%s,%s) on conflict (legacy_source,legacy_code) do nothing""",
                    [params(r) for r in admins])
    cur.execute("select count(*) from public.management_companies where legacy_source=%s", (SOURCE,))
    out["administradoras_criadas"] = cur.fetchone()[0] - before

    cur.execute("select count(*) from public.customers where legacy_source=%s", (SOURCE,))
    before = cur.fetchone()[0]
    cur.executemany(f"""insert into public.customers (legacy_source,{cols},customer_kind)
        values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) on conflict (legacy_source,legacy_code) do nothing""",
                    [params(r, (r["customer_kind"],)) for r in customers])
    cur.execute("select count(*) from public.customers where legacy_source=%s", (SOURCE,))
    out["clientes_criados"] = cur.fetchone()[0] - before

    # Reexecução: só preenche o tipo de quem continua "a classificar" (nunca desfaz ajuste manual).
    reclass = [(r["customer_kind"], SOURCE, r["legacy_code"]) for r in customers if r["customer_kind"] != "unclassified"]
    cur.executemany("""update public.customers set customer_kind=%s
        where legacy_source=%s and legacy_code=%s and customer_kind='unclassified'""", reclass)

    ids = {}
    for table in ("management_companies", "customers"):
        cur.execute(f"select legacy_code,id from public.{table} where legacy_source=%s", (SOURCE,))
        ids[table] = dict(cur.fetchall())
    cur.execute("select customer_id, management_company_id from public.management_assignments where ended_at is null")
    active = dict(cur.fetchall())
    new, same, conflict, orphan = [], 0, 0, 0
    for r in customers:
        if not r["manager_legacy_code"]:
            continue
        admin_id = ids["management_companies"].get(r["manager_legacy_code"])
        customer_id = ids["customers"].get(r["legacy_code"])
        if not admin_id or not customer_id:
            orphan += 1
        elif customer_id in active:
            same, conflict = (same + 1, conflict) if active[customer_id] == admin_id else (same, conflict + 1)
        else:
            new.append((admin_id, customer_id, SOURCE))
    cur.executemany("""insert into public.management_assignments
        (management_company_id,customer_id,source_system) values (%s,%s,%s)""", new)
    out.update(vinculos_criados=len(new), vinculos_ja_existentes=same,
               vinculos_conflitantes_nao_alterados=conflict, vinculos_orfaos_ignorados=orphan)
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", default="private_export", help="pasta com administradoras.csv e clientes.csv")
    parser.add_argument("--apply", action="store_true", help="grava no Supabase (sem isso, só confere)")
    parser.add_argument("--no-classify", action="store_true", help="não deduz o tipo pelo nome (tudo 'a classificar')")
    parser.add_argument("--allow-local", action="store_true", help="permite Postgres em localhost (testes)")
    args = parser.parse_args()
    folder = Path(args.input)
    admins = read_csv(folder / "administradoras.csv")
    customers = read_csv(folder / "clientes.csv")
    override_file = folder / "classificacao.csv"
    overrides = {r["legacy_code"]: r["customer_kind"] for r in read_csv(override_file)} if override_file.exists() else {}

    report = validate(admins, customers)
    report["tipos_de_cliente"] = classify(customers, overrides, not args.no_classify)
    report["ajustes_manuais_de_tipo"] = len(overrides)
    preview = folder / "previa_classificacao.csv"
    with preview.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["legacy_code", "trade_name", "customer_kind", "manager_legacy_code"])
        writer.writerows([r["legacy_code"], r["trade_name"], r["customer_kind"], r["manager_legacy_code"]] for r in customers)
    print("Conferência local:", json.dumps(report, ensure_ascii=False, indent=2))
    print(f"Prévia dos tipos gravada em {preview}. Para corrigir, copie as linhas para classificacao.csv.")
    if not args.apply:
        print("DRY RUN: nada foi enviado ao Supabase.")
        return

    if os.environ.get("MIGRATION_CONFIRM") != CONFIRMATION:
        parser.error(f"Para gravar, defina MIGRATION_CONFIRM={CONFIRMATION}")
    db_url = os.environ.get("SUPABASE_DB_URL") or parser.error("Defina SUPABASE_DB_URL (URI PostgreSQL do projeto)")
    check_target(db_url, args.allow_local)
    import psycopg
    with psycopg.connect(db_url, connect_timeout=20) as conn, conn.cursor() as cur:
        report.update(apply(cur, admins, customers))  # commit só ao final do bloco
    print("Importação concluída:", json.dumps(report, ensure_ascii=False, indent=2))
    (folder / "relatorio_importacao.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
