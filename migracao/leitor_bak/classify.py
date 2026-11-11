import re, unicodedata
def norm(t):
    t=unicodedata.normalize('NFKD',t or '').encode('ascii','ignore').decode()
    return re.sub(r'\s+',' ',re.sub(r'[^A-Z0-9/ ]',' ',t.upper())).strip()
CONDO=re.compile(r'^(COND\b|CONDOMINIO|COMDOMINIO|CONDOMINO|CONDMINIO|EDIFICIO|EDIF\b|ED\b|RESIDENCIAL|CONJUNTO|COJUNTO|CONJ\b)|\b(CONDOMINIO|COMDOMINIO|EDIFICIO|CONJUNTO RESIDENCIAL)\b')
def kind(c):
    names=[norm(c.get('Razao')),norm(c.get('Fantasia'))]
    pessoa=(c.get('Pessoa') or '').strip()
    START=re.compile(r'^(COND\b|CONDOMINIO|COMDOMINIO|CONDOMINO|CONDMINIO|EDIFICIO|EDIF\b|ED\b|RESIDENCIAL|CONJUNTO|COJUNTO)')
    if START.match(names[0]) or (pessoa!='F' and any(CONDO.search(n) for n in names)): return 'condominium'
    if pessoa=='F': return 'person'
    if pessoa=='J': return 'business'
    return 'condominium' if any(CONDO.search(n) for n in names) else 'unclassified'
