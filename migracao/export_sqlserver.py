"""Extrai somente campos cadastrais selecionados de SQL Server restaurado.
Por padrao nao exporta endereco, telefone ou email (podem conter dados pessoais).
"""
import argparse
import csv
import json
import os
import re
from pathlib import Path

import pyodbc

FIELDS_ADMIN = ["legacy_code", "trade_name", "legal_name", "cnpj", "email", "phone", "address_text", "legacy_status"]
FIELDS_CLIENT = FIELDS_ADMIN + ["manager_legacy_code", "customer_kind"]


def legacy_code(value):
    if value is None:
        return ""
    text = str(value).strip()
    if re.fullmatch(r"\d+\.0", text):
        text = text[:-2]
    return text


def cnpj_only(value):
    digits = re.sub(r"\D", "", str(value or ""))
    return digits if len(digits) == 14 else ""


def present(value):
    return str(value).strip() if value is not None else ""


def get_columns(cursor, schema, table):
    cursor.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_SCHEMA=? AND TABLE_NAME=?",
        schema, table,
    )
    return {row[0].lower(): row[0] for row in cursor.fetchall()}


def choose(columns, *candidates, required=False):
    for candidate in candidates:
        found = columns.get(candidate.lower())
        if found:
            return found
    if required:
        raise ValueError(f"Coluna essencial ausente: {candidates} (disponiveis: {list(columns.values())})")
    return None


def export_table(cursor, schema, table, is_customer, include_contacts):
    columns = get_columns(cursor, schema, table)
    col_id = choose(columns, "CodCliente" if is_customer else "Codigo", required=True)
    col_manager = choose(columns, "CodAdministradora", required=True) if is_customer else None
    mapping = {
        "legacy_code": col_id,
        "trade_name": choose(columns, "Fantasia", "NomeFantasia", "Nome"),
        "legal_name": choose(columns, "Razao", "RazaoSocial"),
        "cnpj": choose(columns, "CNPJ"),
        "email": choose(columns, "Email", "EMail"),
        "phone": choose(columns, "Telefone", "Fone"),
        "address_text": choose(columns, "Endereco", "Logradouro"),
        "legacy_status": choose(columns, "Status", "Situacao"),
    }
    if is_customer:
        mapping["manager_legacy_code"] = col_manager
        mapping["customer_kind"] = None  # A tabela Cliente inclui varios tipos.
    identifier = lambda s: "[" + s.replace("]", "]]" ) + "]"
    selected = list(dict.fromkeys(x for x in mapping.values() if x))
    names = ", ".join(identifier(c) for c in selected)
    cursor.execute(f"SELECT {names} FROM {identifier(schema)}.{identifier(table)}")
    indexes = {name: i for i, name in enumerate(selected)}
    results, skipped = [], 0
    for row in cursor:
        def val(key):
            column = mapping.get(key)
            return row[indexes[column]] if column else None
        code = legacy_code(val("legacy_code"))
        if not code:
            skipped += 1
            continue
        trade_name = present(val("trade_name")) or present(val("legal_name"))
        result = {
            "legacy_code": code,
            "trade_name": trade_name or f"Registro legado {code}",
            "legal_name": present(val("legal_name")),
            "cnpj": cnpj_only(val("cnpj")),
            "email": present(val("email")) if include_contacts else "",
            "phone": present(val("phone")) if include_contacts else "",
            "address_text": present(val("address_text")) if include_contacts else "",
            "legacy_status": present(val("legacy_status")),
        }
        if is_customer:
            manager = legacy_code(val("manager_legacy_code"))
            result.update(manager_legacy_code="" if manager in ("0", "-1", "NULL") else manager,
                          customer_kind="unclassified")
        results.append(result)
    keys = [x["legacy_code"] for x in results]
    if len(keys) != len(set(keys)):
        raise ValueError(f"Codigos legados duplicados em {table}; revise antes de importar")
    return results, skipped, columns


def write_csv(path, fieldnames, records):
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="private_export")
    parser.add_argument("--inspect", action="store_true", help="Mostra colunas sem extrair registros")
    parser.add_argument("--schema", default="dbo")
    parser.add_argument("--include-contact-fields", action="store_true",
                        help="Inclui dados pessoais: email, endereco e telefone")
    args = parser.parse_args()
    connstr = os.environ.get("SQLSERVER_CONN_STR")
    if not connstr:
        parser.error("Configure SQLSERVER_CONN_STR para o SQL Server restaurado")
    output = Path(args.out)
    if args.inspect:
        with pyodbc.connect(connstr, timeout=25) as connection:
            cursor = connection.cursor()
            for table in ("Administradora", "Cliente"):
                columns = get_columns(cursor, args.schema, table)
                print(f"{args.schema}.{table}: {sorted(columns.values())}")
        return
    output.mkdir(parents=True, exist_ok=True)
    with pyodbc.connect(connstr, timeout=25) as connection:
        cursor = connection.cursor()
        admins, dropped_admin, cols_admin = export_table(
            cursor, args.schema, "Administradora", False, args.include_contact_fields)
        customers, dropped_customer, cols_customer = export_table(
            cursor, args.schema, "Cliente", True, args.include_contact_fields)
    admin_codes = {r["legacy_code"] for r in admins}
    links = [r for r in customers if r["manager_legacy_code"]]
    missing = [r for r in links if r["manager_legacy_code"] not in admin_codes]
    report = {
        "administradoras": len(admins), "clientes": len(customers),
        "clientes_com_administradora": len(links),
        "vinculos_sem_administradora_encontrada": len(missing),
        "clientes_sem_vinculo": len(customers) - len(links),
        "registros_sem_codigo_descartados": dropped_admin + dropped_customer,
        "contatos_exportados": args.include_contact_fields,
        "colunas_administradora_identificadas": sorted(cols_admin.values()),
        "colunas_cliente_identificadas": sorted(cols_customer.values()),
    }
    write_csv(output / "administradoras.csv", FIELDS_ADMIN, admins)
    write_csv(output / "clientes.csv", FIELDS_CLIENT, customers)
    (output / "relatorio_exportacao.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if not k.startswith("colunas_")},
                     ensure_ascii=False, indent=2))
    if missing:
        print("ATENCAO: existem codigos de administradora ausentes. Vínculos serao ignorados.")


if __name__ == "__main__":
    main()
