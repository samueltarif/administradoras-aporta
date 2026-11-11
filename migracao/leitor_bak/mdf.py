import struct, pickle

D = open('/tmp/bak/a.bak', 'rb').read()
PAGES = pickle.load(open('/tmp/bak/pages.pkl', 'rb'))


def page(pid):
    o = PAGES.get(pid)
    return None if o is None else D[o:o + 8192]


def alloc_unit(p):
    idx, = struct.unpack_from('<H', p, 6)
    obj, = struct.unpack_from('<I', p, 24)
    return (idx << 48) | (obj << 16)


def records(p):
    n, = struct.unpack_from('<H', p, 22)
    for i in range(n):
        off, = struct.unpack_from('<H', p, 8192 - 2 * (i + 1))
        if off == 0:
            continue
        r = parse(p, off)
        if r:
            yield r


def parse(p, off):
    a = p[off]
    rtype = (a >> 1) & 7
    if rtype != 0:  # só registros primários
        return None
    fixend, = struct.unpack_from('<H', p, off + 2)
    fixed = p[off + 4: off + fixend]
    pos = off + fixend
    ncol, = struct.unpack_from('<H', p, pos); pos += 2
    nb = (ncol + 7) // 8
    nulls = p[pos:pos + nb]; pos += nb
    var = []
    if a & 0x20:
        nvar, = struct.unpack_from('<H', p, pos); pos += 2
        ends = struct.unpack_from('<%dH' % nvar, p, pos); pos += 2 * nvar
        start = pos
        for e in ends:
            complex_ = bool(e & 0x8000); e &= 0x7fff
            var.append((p[start - 0 if False else start: off + e], complex_))
            start = off + e
    isnull = lambda i: bool(nulls[i // 8] >> (i % 8) & 1) if nb else False
    return {'fixed': fixed, 'var': var, 'ncol': ncol, 'isnull': isnull}


def all_records(au):
    for pid, o in sorted(PAGES.items()):
        p = D[o:o + 8192]
        if p[1] == 1 and alloc_unit(p) == au:
            yield from records(p)
