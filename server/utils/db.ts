import type { H3Event } from 'h3'
import type { PostgrestError } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { serverSupabaseClient } from '#supabase/server'

/** Cliente com a sessão do usuário: toda leitura e escrita passa pela RLS. */
export function userDb(event: H3Event) {
  return serverSupabaseClient<Database>(event)
}

/** Termo de busca seguro para filtros PostgREST `.or(...)` (remove sintaxe de filtro). */
export function searchTerm(q: string): string {
  return q.normalize('NFC').replace(/[^\p{L}\p{N}\s.\-@&/]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export function orIlike(term: string, columns: string[], exact: string[] = []): string {
  const like = columns.map(c => `${c}.ilike."%${term}%"`)
  const eq = exact.map(c => `${c}.eq."${term}"`)
  return [...like, ...eq].join(',')
}

export function pageRange(page: number, pageSize: number): [number, number] {
  const from = (page - 1) * pageSize
  return [from, from + pageSize - 1]
}

/** Converte erros do PostgREST em respostas HTTP sem vazar detalhes internos. */
export function dbFail(error: PostgrestError, fallback = 'Não foi possível concluir a operação'): never {
  const map: Record<string, [number, string]> = {
    '42501': [403, 'Sem permissão para esta operação'],
    '23505': [409, 'Já existe um registro com esses dados'],
    '23503': [409, 'Registro relacionado não encontrado ou em uso'],
    '23514': [422, 'Dados fora das regras permitidas'],
    'PGRST116': [404, 'Registro não encontrado'],
  }
  // Erros levantados pelas regras do banco já trazem mensagem amigável em português.
  if (error.code === 'P0002') throw createError({ statusCode: 404, statusMessage: error.message })
  if (error.code === '22023') throw createError({ statusCode: 422, statusMessage: error.message })
  if (error.code === '42501' && !error.message.includes('row-level security') && !error.message.startsWith('permission denied')) {
    throw createError({ statusCode: 403, statusMessage: error.message })
  }
  const [statusCode, statusMessage] = map[error.code] ?? [500, fallback]
  if (statusCode === 500) console.error('[db]', error.code, error.message)
  throw createError({ statusCode, statusMessage })
}
