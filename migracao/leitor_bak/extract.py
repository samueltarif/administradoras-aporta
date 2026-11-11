import struct, pickle, json
from mdf import all_records

cols = pickle.load(open('/tmp/bak/cols.pkl', 'rb'))
rows, aus, rscols = pickle.load(open('/tmp/bak/meta.pkl', 'rb'))
TABLES = {245575913: ('Administradora', (120 << 16) | (256 << 48)),
          261575970: ('Cliente', (123 << 16) | (256 << 48))}


def decode(oid):
    rsid = [k for k, v in rows.items() if v[0] == oid][0]
    phys = {c[0]: c for c in rscols[rsid]}  # colid -> (rscolid,hb,offset,nullbit,maxinrow)
    meta = {c[0]: c for c in cols[oid]}     # colid -> (colid,name,xtype,length,...)
    out = []
    for r in all_records(TABLES[oid][1]):
        row = {}
        for colid, (_, name, xtype, length, *_r) in sorted(meta.items()):
            _, _, off, nullbit, _ = phys[colid]
            if r['isnull'](nullbit - 1):
                row[name] = None
                continue
            if off < 0x8000:  # fixo
                b = r['fixed'][off - 4: off - 4 + length]
                if xtype == 56:
                    row[name] = struct.unpack('<i', b)[0]
                elif xtype == 58:
                    mins, days = struct.unpack('<HH', b)
                    row[name] = f'd{days}m{mins}'
                else:
                    row[name] = b.decode('cp1252').strip()
            else:
                k = 0xFFFF - off
                if k >= len(r['var']):
                    row[name] = ''
                    continue
                b, complex_ = r['var'][k]
                if complex_:
                    row[name] = None  # texto longo fora da linha (Obs): não usado
                elif xtype == 231:
                    row[name] = b.decode('utf-16le', 'replace').strip()
                else:
                    row[name] = b.decode('cp1252', 'replace').strip()
        out.append(row)
    return out


data = {name: decode(oid) for oid, (name, _) in TABLES.items()}
json.dump(data, open('/tmp/bak/dados.json', 'w'), ensure_ascii=False)
for k, v in data.items():
    print(k, len(v))
