"""Migra CSVs locais para o PostgreSQL do Supabase; dry-run por padrao."""
import argparse
import csv
import json
import os
from pathlib import Path

SOURCE = "portamovel_sqlserver_2026_11_04"


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def validate(admins, customers):
    admin_codes = [r["legacy_code"].strip() for r in admins]
    customer_codes = [r["legacy_code"].strip() for r in customers]
    if not all(admin_codes) or not all(customer_codes):
        raise ValueError("Arquivo com codigo legado vazio. Corrija a exportacao.")
    if len(set(admin_codes)) != len(admin_codes):
        raise ValueError("Duplicidade de codigos legados de administradoras.")
    if len(set(customer_codes)) != len(customer_codes):
        raise ValueError("Duplicidade de codigos legados de clientes.")
    all_admins = set(admin_codes)
    links = [r for r in customers if r["manager_legacy_code"].strip()]
    orphans = [r for r in links if r["manager_legacy_code"].strip() not in all_admins]
    return {
        "administradoras": len(admins), "clientes": len(customers),
        "vinculos_previstos": len(links) - len(orphans),
        "vinculos_orfaos": len(orphans),
        "clientes_sem_administradora": len(customers) - len(links),
    }


def import_admins(cur, rows):
    inserted = 0
    sql = """
        insert into public.management_companies
          (legacy_source,legacy_code,trade_name,legal_name,cnpj,
           email,phone,address_text,legacy_status)
        values (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        on conflict (legacy_source,legacy_code) do nothing
    """
    for r in rows:
        cur.execute(sql, (SOURCE, r["legacy_code"].strip(), r["trade_name"],
            r["legal_name"] or None, r["cnpj"] or None, r["email"] or None,
            r["phone"] or None, r["address_text"] or None, r["legacy_status"] or None))
        inserted += cur.rowcount
    return inserted


def import_customers(cur, rows):
    inserted = 0
    sql = """
        insert into public.customers
          (legacy_source,legacy_code,trade_name,legal_name,customer_kind,
           cnpj,email,phone,address_text,legacy_status)
        values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        on conflict (legacy_source,legacy_code) do nothing
    """
    for r in rows:
        kind = r["customer_kind"] or "unclassified"
        if kind not in {"unclassified", "condominium", "business", "person"}:
            raise ValueError("Tipo de cliente invalido no CSV")
        cur.execute(sql, (SOURCE, r["legacy_code"].strip(), r["trade_name"],
            r["legal_name"] or None, kind, r["cnpj"] or None,
            r["email"] or None, r["phone"] or None, r["address_text"] or None,
            r["legacy_status"] or None))
        inserted += cur.rowcount
    return inserted


def load_legacy_ids(cur, table):
    cur.execute(f"SELECT legacy_code,id FROM public.{table} WHERE legacy_source = %s", (SOURCE,))
    return dict(cur.fetchall())


def import_links(cur, rows, admin_ids, customer_ids):
    added, unchanged, conflicts, orphans = 0, 0, 0, 0
    for r in rows:
        admin_code = r["manager_legacy_code"].strip()
        if not admin_code:
            continue
        admin_id = admin_ids.get(admin_code)
        customer_id = customer_ids.get(r["legacy_code"].strip())
        if not admin_id or not customer_id:
            orphans += 1
            continue
        cur.execute("""select management_company_id from public.management_assignments
            where customer_id = %s and ended_at is null""", (customer_id,))
        current = cur.fetchone()
        if current:
            if current[0] == admin_id:
                unchanged += 1
            else:
                conflicts += 1  # Jamais sobrescrever vinculo alterado manualmente.
            continue
        cur.execute("""insert into public.management_assignments
            (management_company_id,customer_id,source_system)
            values (%s,%s,%s)""", (admin_id, customer_id, SOURCE))
        added += 1
    return {"vinculos_criados": added, "vinculos_ja_existentes": unchanged,
            "vinculos_conflitantes_nao_alterados": conflicts,
            "vinculos_orfaos_ignorados": orphans}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="private_export")
    parser.add_argument("--apply", action="store_true", help="Persiste no Supabase")
    args = parser.parse_args()
    input_dir = Path(args.input)
    admins = read_csv(input_dir / "administradoras.csv")
    customers = read_csv(input_dir / "clientes.csv")
    report = validate(admins, customers)
    print("Conferencia local (sem upload):", json.dumps(report, ensure_ascii=False, indent=2))
    if not args.apply:
        print("DRY RUN. Nenhuma conexao ao Supabase foi realizada.")
        return
    confirmation = "I_UNDERSTAND_THIS_UPLOADS_REAL_CUSTOMER_DATA"
    if os.environ.get("MIGRATION_CONFIRM") != confirmation:
        parser.error(f"Para importar, defina MIGRATION_CONFIRM={confirmation}")
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        parser.error("Defina SUPABASE_DB_URL (conexao PostgreSQL, nao anon key)")
    import psycopg
    with psycopg.connect(db_url, connect_timeout=20) as conn:
        with conn.cursor() as cur:
            # Transacao unica: qualquer erro reverte todas as importacoes.
            report["administradoras_criadas"] = import_admins(cur, admins)
            report["clientes_criados"] = import_customers(cur, customers)
            admin_ids = load_legacy_ids(cur, "management_companies")
            client_ids = load_legacy_ids(cur, "customers")
            report.update(import_links(cur, customers, admin_ids, client_ids))
    print("Importacao concluida:", json.dumps(report, ensure_ascii=False, indent=2))
    (input_dir / "relatorio_importacao.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
