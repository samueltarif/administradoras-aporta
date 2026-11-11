// Auditoria funcional e de segurança E2E — Portal A Porta Móvel
// Executa verificações nos 8 perfis e nas políticas de RLS / API.
import { createClient } from '@supabase/supabase-js'
import { readPasswords } from './seed/lib.mjs'
import { USERS } from './seed/data.mjs'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const baseHttp = process.env.E2E_BASE_URL || 'http://localhost:3000'
const passwords = readPasswords(USERS)

export async function runSecurityAudit() {
  const results = { passed: 0, failed: 0, details: [] }
  const record = (name, ok, reason = '') => {
    if (ok) { results.passed++; results.details.push(`[PASS] ${name}`) }
    else { results.failed++; results.details.push(`[FAIL] ${name}: ${reason}`) }
  }

  // 1. Testa autenticação e contexto de cada um dos 8 perfis
  const sessions = {}
  for (const u of USERS) {
    const sb = createClient(url, anonKey)
    const { data, error } = await sb.auth.signInWithPassword({
      email: u.email,
      password: passwords[u.key]
    })
    const ok = !error && Boolean(data.session?.access_token)
    record(`Login perfil ${u.key} (${u.email})`, ok, error?.message)
    if (ok) sessions[u.key] = { token: data.session.access_token, sb }
  }

  // Helper HTTP autenticado
  const fetchApi = async (path, token) => {
    const res = await fetch(`${baseHttp}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    let body = null
    try { body = await res.json() } catch { /* ignore */ }
    return { status: res.status, body }
  }

  // 2. Anon sem credencial
  const anonMe = await fetchApi('/api/me')
  record('Acesso anônimo a /api/me é rejeitado', anonMe.status === 401)
  const anonStats = await fetchApi('/api/admin/stats')
  record('Acesso anônimo a /api/admin/stats é rejeitado', anonStats.status === 401)

  // 3. Perfis e escopos via /api/me
  const meOwner = await fetchApi('/api/me', sessions.owner?.token)
  record('Proprietário tem staffRole owner', meOwner.body?.staffRole === 'owner')

  const meOps = await fetchApi('/api/me', sessions.ops?.token)
  record('Operações tem staffRole operations', meOps.body?.staffRole === 'operations')

  const meAlfa = await fetchApi('/api/me', sessions.mgrAlfa?.token)
  record('Gestora Alfa tem vínculo manager com Administradora Alfa',
    meAlfa.body?.managements?.some(m => m.name.includes('Alfa') && m.role === 'manager'))

  const meBeta = await fetchApi('/api/me', sessions.mgrBeta?.token)
  record('Gestora Beta tem vínculo manager com Administradora Beta',
    meBeta.body?.managements?.some(m => m.name.includes('Beta') && m.role === 'manager'))

  const meSyndic = await fetchApi('/api/me', sessions.syndic?.token)
  record('Síndico Jardins tem vínculo syndic com Residencial Jardins',
    meSyndic.body?.customers?.some(c => c.name.includes('Jardins') && c.role === 'syndic'))

  const mePorter = await fetchApi('/api/me', sessions.porter?.token)
  record('Porteiro Jardins tem vínculo porter com Residencial Jardins',
    mePorter.body?.customers?.some(c => c.name.includes('Jardins') && c.role === 'porter'))

  const meAvulso = await fetchApi('/api/me', sessions.indep?.token)
  record('Síndico avulso tem vínculo syndic sem administradora',
    meAvulso.body?.customers?.some(c => c.name.includes('Vila Avulsa')))

  // 4. Isolamento entre administradoras: Gestora Beta NÃO vê clientes da Alfa
  const { sb: sbBeta } = sessions.mgrBeta || {}
  const { data: betaCustomers } = await sbBeta.from('customers').select('trade_name')
  const alfaLeakedInBeta = betaCustomers?.some(c => c.trade_name.includes('Ipês') || c.trade_name.includes('Colinas'))
  record('RLS Supabase: Gestora Beta não lista clientes exclusivos da Alfa', !alfaLeakedInBeta)

  // 5. Isolamento de chamados: Síndico Jardins não vê chamados do Condomínio Ipês
  const { sb: sbSyndic } = sessions.syndic || {}
  const { data: syndicTickets } = await sbSyndic.from('tickets').select('title, customer_id')
  const otherCondoTicket = syndicTickets?.some(t => t.title.includes('Ipês'))
  record('RLS Supabase: Síndico Jardins não vê chamados de outros prédios', !otherCondoTicket)

  // 6. Proteção de notas internas: síndico não acessa ticket_internal_notes
  const { data: notesSyndic, error: errNotes } = await sbSyndic.from('ticket_internal_notes').select('*')
  record('RLS Supabase: Notas internas inacessíveis para o síndico', (notesSyndic?.length === 0 || !!errNotes))

  // 7. Proteção de valores financeiros: porteiro não lê contract_financials
  const { sb: sbPorter } = sessions.porter || {}
  const { data: finPorter } = await sbPorter.from('contract_financials').select('*')
  record('RLS Supabase: Dados financeiros de contratos inacessíveis ao porteiro', (finPorter?.length === 0))

  // 8. Controle de acesso por rotas no servidor
  const porterAdmin = await fetchApi('/api/admin/stats', sessions.porter?.token)
  record('Porteiro tem acesso negado em APIs do painel /api/admin/*', porterAdmin.status === 403)

  const gestoraAdmin = await fetchApi('/api/admin/stats', sessions.mgrAlfa?.token)
  record('Gestora externa tem acesso negado em APIs do painel /api/admin/*', gestoraAdmin.status === 403)

  return results
}

if (process.argv[1]?.endsWith('audit-e2e-security.mjs')) {
  runSecurityAudit().then(r => {
    console.log(`\n=== AUDITORIA DE SEGURANÇA E PERFIS ===`)
    r.details.forEach(d => console.log(d))
    console.log(`\nTotal aprovados: ${r.passed} | Total reprovados: ${r.failed}`)
    process.exit(r.failed ? 1 : 0)
  }).catch(e => {
    console.error('Falha geral na auditoria:', e)
    process.exit(1)
  })
}
