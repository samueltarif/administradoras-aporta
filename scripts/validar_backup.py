"""Valida um backup gerado por backup-supabase.ps1 SEM exibir conteúdo.

Uso: python scripts/validar_backup.py backups/<pasta> [supabase/rollback/backup_expected_counts.json]
Confere hashes do manifesto, conta linhas de cada COPY e compara com as contagens esperadas.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

COPY_RE = re.compile(r'^COPY\s+"?([\w]+)"?\."?([\w]+)"?\s')


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest().upper()


def copy_counts(path: Path) -> dict:
    counts, current = {}, None
    with path.open(encoding='utf-8', errors='replace') as f:
        for line in f:
            if current is None:
                m = COPY_RE.match(line)
                if m:
                    current = f'{m.group(1)}.{m.group(2)}'
                    counts[current] = 0
            elif line.rstrip('\r\n') == '\\.':
                current = None
            else:
                counts[current] += 1
    return counts


def main() -> int:
    folder = Path(sys.argv[1])
    expected_file = Path(sys.argv[2] if len(sys.argv) > 2 else 'supabase/rollback/backup_expected_counts.json')
    problems, notes = [], []

    manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8-sig'))
    for entry in manifest['files']:
        p = folder / entry['file']
        if not p.exists() or sha256(p) != entry['sha256'].upper():
            problems.append(f"hash divergente ou arquivo ausente: {entry['file']}")
    print(f"Projeto: {manifest['projectRef']} | modo: {manifest['mode']} | criado: {manifest['createdAt']}")

    data = copy_counts(folder / 'data.sql')
    expected = json.loads(expected_file.read_text(encoding='utf-8'))
    print(f"\n{'tabela':45} {'backup':>8} {'esperado':>9}  situação")
    for table, rule in expected['tables'].items():
        got = data.get(table)
        exp = rule['count']
        if got is None:
            status = 'AUSENTE' if exp > 0 or rule['kind'] != 'volatile' else 'vazia (ok)'
            if status == 'AUSENTE':
                problems.append(f'tabela sem COPY no data.sql: {table}')
        elif rule['kind'] == 'stable' and got < exp:
            status = 'MENOS LINHAS'
            problems.append(f'{table}: {got} < {exp}')
        else:
            status = 'ok' if rule['kind'] == 'stable' else 'ok (volátil)'
        print(f"{table:45} {str(got if got is not None else '-'):>8} {exp:>9}  {status}")

    schema = (folder / 'schema.sql').read_text(encoding='utf-8', errors='replace')
    for table in expected['schema_must_contain']:
        if not re.search(rf'CREATE TABLE (IF NOT EXISTS )?"?public"?\."?{table}"?', schema):
            problems.append(f'schema.sql sem a tabela public.{table}')
    notes.append(f"policies em schema.sql: {len(re.findall(r'CREATE POLICY', schema))}")
    notes.append(f"funções em schema.sql: {len(re.findall(r'CREATE (OR REPLACE )?FUNCTION', schema))}")
    managed = folder / 'managed_auth_storage.sql'
    if managed.exists():
        has_trigger = 'on_portamovel_auth_user_created' in managed.read_text(encoding='utf-8', errors='replace')
        notes.append(f'trigger do portal em auth.users no dump gerenciado: {"sim" if has_trigger else "não"}')
    for name in ('roles.sql', 'history_schema.sql', 'history_data.sql', 'managed_auth_storage.sql'):
        notes.append(f"{name}: {'presente' if (folder / name).exists() else 'ausente'}")

    print('\n' + '\n'.join(notes))
    if problems:
        print('\nFALHAS:\n- ' + '\n- '.join(problems))
        return 1
    print('\nBACKUP VALIDADO')
    return 0


if __name__ == '__main__':
    sys.exit(main())
