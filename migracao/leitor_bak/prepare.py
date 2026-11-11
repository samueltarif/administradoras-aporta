import json, re
from classify import kind
d=json.load(open('dados.json')); A,C=d['Administradora'],d['Cliente']
def s(v): return re.sub(r'\s+',' ',(v or '')).strip()
def cnpj(v):
    x=re.sub(r'\D','',v or ''); return x if len(x)==14 else None
def addr(r):
    rua=' '.join(p for p in [s(r.get('TipoEnd')),s(r.get('Endereco'))] if p)
    if s(r.get('Numero')): rua+=', '+s(r['Numero'])
    parts=[rua,s(r.get('Complemento')),s(r.get('Bairro'))]
    cid=s(r.get('Cidade')); uf=s(r.get('Estado'))
    parts.append(f"{cid}/{uf}" if cid and uf else cid or uf)
    if s(r.get('CEP')): parts.append('CEP '+s(r['CEP']))
    return ' - '.join(p for p in parts if p) or None
def base(r,code):
    name=s(r.get('Fantasia')) or s(r.get('Razao'))
    return {'legacy_code':str(code),'trade_name':name,'legal_name':s(r.get('Razao')) or None,'cnpj':cnpj(r.get('CNPJ')),
            'address_text':addr(r),'city':s(r.get('Cidade')),'uf':s(r.get('Estado')),'legacy_status':s(r.get('Status')) or None,
            'active': s(r.get('Status'))!='D'}
admins=[base(a,a['Codigo']) for a in A]
codes={a['legacy_code'] for a in admins}
cust=[]
for c in C:
    r=base(c,c['CodCliente']); r['customer_kind']=kind(c)
    m=c.get('CodAdministradora'); m='' if m in (None,0,-1) else str(m)
    r['manager_legacy_code']=m if m in codes else ''
    r['orphan_manager']=m if m and m not in codes else ''
    cust.append(r)
json.dump({'admins':admins,'customers':cust},open('final.json','w'),ensure_ascii=False)
print(len(admins),len(cust),sum(1 for c in cust if c['manager_legacy_code']), [c for c in cust if c['orphan_manager']][0]['trade_name'])
print(cust[0]['address_text']); print(max(len(a['trade_name']) for a in admins+cust), min(len(a['trade_name']) for a in admins+cust))
