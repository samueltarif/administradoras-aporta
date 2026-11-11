import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const OLD_PROJECT = 'fbzkhxfcsxkqrpqfitwr' // projeto do site institucional: NUNCA semear

/** UUID determinístico (formato v5) a partir de uma chave: reexecuções não duplicam registros. */
export function demoId(key) {
  const h = createHash('sha1').update(`portamovel-demo:${key}`).digest()
  h[6] = (h[6] & 0x0f) | 0x50
  h[8] = (h[8] & 0x3f) | 0x80
  const x = h.subarray(0, 16).toString('hex')
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`
}

/** Travas de segurança: só roda com flag, confirmação explícita do projeto e nunca no projeto antigo. */
export function guardEnvironment(argv) {
  const url = process.env.SUPABASE_URL ?? ''
  const ref = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
  const confirm = argv.find(a => a.startsWith('--confirm-project='))?.split('=')[1]
  const fail = (msg) => { console.error(`[seed] ABORTADO: ${msg}`); process.exit(1) }
  if (process.env.DEMO_SEED_ENABLED !== 'true') fail('defina DEMO_SEED_ENABLED=true (somente em desenvolvimento).')
  if (process.env.NODE_ENV === 'production') fail('NODE_ENV=production.')
  if (!ref) fail('SUPABASE_URL ausente ou inválida.')
  if (ref === OLD_PROJECT) fail('este é o projeto do site institucional.')
  if (confirm !== ref) fail(`confirme o projeto com --confirm-project=${ref}.`)
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
  if (!serviceKey || !anonKey) fail('chaves do Supabase ausentes no .env.')
  return { url, ref, serviceKey, anonKey }
}

export function adminClient({ url, serviceKey }) {
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function userClient({ url, anonKey }) {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function must({ error, data }, what) {
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

export function readPasswords(users) {
  const out = {}
  for (const u of users) {
    const pw = process.env[u.env]
    if (!pw || pw.length < 12) throw new Error(`Senha ${u.env} ausente ou curta (mín. 12) no arquivo local.`)
    out[u.key] = pw
  }
  if (new Set(Object.values(out)).size !== users.length) throw new Error('As senhas demo devem ser diferentes entre si.')
  return out
}

export const daysFromNow = d => new Date(Date.now() + d * 86400000).toISOString()
