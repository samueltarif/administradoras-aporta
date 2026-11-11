// Seed de DEMONSTRAÇÃO (dados fictícios) — somente projeto de desenvolvimento do portal.
// Uso: npm run seed:demo -- --confirm-project=<ref>   (lê .env e migracao/demo_passwords.local.env)
import { COMPANIES, CONTRACTS, CUSTOMERS, TICKETS, USERS, VISITS } from './seed/data.mjs'
import { adminClient, daysFromNow, demoId, guardEnvironment, must, readPasswords, userClient } from './seed/lib.mjs'

const env = guardEnvironment(process.argv)
const passwords = readPasswords(USERS)
const db = adminClient(env)
const uid = {}

async function seedUsers() {
  const { users } = must(await db.auth.admin.listUsers({ perPage: 1000 }), 'listar usuários')
  for (const u of USERS) {
    const existing = users.find(x => x.email === u.email)
    const attrs = { password: passwords[u.key], email_confirm: true, user_metadata: { full_name: u.name, demo: true } }
    const res = existing
      ? await db.auth.admin.updateUserById(existing.id, attrs)
      : await db.auth.admin.createUser({ email: u.email, ...attrs })
    uid[u.key] = must(res, `usuário ${u.email}`).user.id
    must(await db.from('user_profiles').upsert({ user_id: uid[u.key], display_name: u.name, active: true }), 'perfil')
  }
}

async function seedRegistry() {
  must(await db.from('management_companies').upsert(COMPANIES.map(c => ({
    id: demoId(`company:${c.key}`), trade_name: c.trade_name, legal_name: c.legal_name, email: c.email,
  }))), 'administradoras')
  must(await db.from('customers').upsert(CUSTOMERS.map(c => ({
    id: demoId(`customer:${c.key}`), trade_name: c.trade_name, customer_kind: c.kind,
  }))), 'clientes')
  for (const c of CUSTOMERS.filter(x => x.mgmt)) {
    const customerId = demoId(`customer:${c.key}`)
    const target = demoId(`company:${c.mgmt}`)
    const current = must(await db.from('management_assignments').select('management_company_id')
      .eq('customer_id', customerId).is('ended_at', null).maybeSingle(), 'vínculo atual')
    if (!current) must(await db.from('management_assignments').insert({ customer_id: customerId, management_company_id: target, source_system: 'demo_seed' }), 'vínculo')
    else if (current.management_company_id !== target) console.warn(`[seed] vínculo de ${c.key} foi alterado manualmente; mantido.`)
  }
}

async function seedMemberships() {
  for (const u of USERS) {
    if (u.staff) must(await db.from('staff_memberships').upsert({ user_id: uid[u.key], staff_role: u.staff, active: true }), 'equipe')
    if (u.mgmt) must(await db.from('management_memberships').upsert({ user_id: uid[u.key], management_company_id: demoId(`company:${u.mgmt[0]}`), member_role: u.mgmt[1], active: true }), 'vínculo administradora')
    if (u.cust) must(await db.from('customer_memberships').upsert({ user_id: uid[u.key], customer_id: demoId(`customer:${u.cust[0]}`), member_role: u.cust[1], active: true }), 'vínculo cliente')
  }
}

async function seedOperations() {
  must(await db.from('service_contracts').upsert(CONTRACTS.map((k, i) => ({
    id: demoId(`contract:${k.key}`), customer_id: demoId(`customer:${k.customer}`),
    contractor_type: k.by ? 'management' : 'customer', contractor_management_id: k.by ? demoId(`company:${k.by}`) : null,
    contract_number: `DEMO-2026-${String(i + 1).padStart(3, '0')}`, title: k.title, maintenance_frequency: k.freq,
    status: k.status, starts_on: '2026-01-01', ends_on: k.status === 'closed' ? '2026-06-30' : null,
  }))), 'contratos')
  must(await db.from('contract_financials').upsert(CONTRACTS.map(k => ({
    contract_id: demoId(`contract:${k.key}`), monthly_value: k.value, billing_notes: 'Valor fictício de demonstração',
  }))), 'financeiro')

  const assigned = s => ['scheduled', 'in_progress', 'waiting_material', 'resolved', 'closed'].includes(s)
  must(await db.from('tickets').upsert(TICKETS.map((t, i) => ({
    id: demoId(`ticket:${i}`), customer_id: demoId(`customer:${t.customer}`), created_by: uid[t.by],
    title: t.title, description: `${t.title}. Chamado fictício de demonstração.`, category: t.category,
    priority: t.priority, status: t.status, location_detail: 'Portaria / garagem',
    assigned_to: assigned(t.status) ? uid.ops : null, created_at: daysFromNow(-t.daysAgo),
    closed_at: ['closed', 'cancelled'].includes(t.status) ? daysFromNow(-t.daysAgo + 1) : null,
  })), { onConflict: 'id', ignoreDuplicates: true }), 'chamados')

  const messages = TICKETS.flatMap((t, i) => i % 3 ? [] : [
    { id: demoId(`msg:${i}:a`), ticket_id: demoId(`ticket:${i}`), author_id: uid[t.by], body: 'Pode verificar o quanto antes? Obrigado.' },
    { id: demoId(`msg:${i}:b`), ticket_id: demoId(`ticket:${i}`), author_id: uid.ops, body: 'Recebido. Técnico será designado e informaremos a data.' },
  ])
  must(await db.from('ticket_messages').upsert(messages, { onConflict: 'id', ignoreDuplicates: true }), 'mensagens')
  must(await db.from('ticket_internal_notes').upsert(TICKETS.flatMap((_, i) => i % 4 ? [] : [
    { id: demoId(`note:${i}`), ticket_id: demoId(`ticket:${i}`), author_id: uid.ops, body: 'Nota interna (demo): verificar estoque de peças.' },
  ]), { onConflict: 'id', ignoreDuplicates: true }), 'notas internas')
  must(await db.from('technical_visits').upsert(VISITS.map((v, i) => ({
    id: demoId(`visit:${i}`), customer_id: demoId(`customer:${v.customer}`),
    contract_id: v.contract ? demoId(`contract:${v.contract}`) : null,
    ticket_id: v.ticket !== undefined ? demoId(`ticket:${v.ticket}`) : null,
    title: v.title, scheduled_for: daysFromNow(v.inDays), status: v.status, assigned_to: uid.ops,
    completed_at: v.status === 'completed' ? daysFromNow(v.inDays) : null,
    result_summary: v.status === 'completed' ? 'Serviço concluído (demo).' : null,
  })), { onConflict: 'id', ignoreDuplicates: true }), 'visitas')
}

/** Teste real: login de cada conta com a chave pública e contagem do que a RLS libera. */
async function verifyLogins() {
  console.log('\nconta                              chamados  clientes  contratos  financeiro')
  for (const u of USERS) {
    const c = userClient(env)
    must(await c.auth.signInWithPassword({ email: u.email, password: passwords[u.key] }), `login ${u.email}`)
    const count = async t => (await c.from(t).select('*', { count: 'exact', head: true })).count ?? 0
    const row = [await count('tickets'), await count('customers'), await count('service_contracts'), await count('contract_financials')]
    console.log(u.email.padEnd(35), ...row.map(n => String(n).padStart(9)))
    await c.auth.signOut()
  }
}

try {
  console.log(`[seed] projeto ${env.ref}`)
  await seedUsers(); await seedRegistry(); await seedMemberships(); await seedOperations()
  console.log('[seed] dados de demonstração gravados.')
  await verifyLogins()
  console.log('\n[seed] concluído. Senhas: migracao/demo_passwords.local.env (não versionado).')
}
catch (e) {
  console.error('[seed] FALHOU:', e.message)
  process.exit(1)
}
