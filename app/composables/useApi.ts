import type { FetchOptions } from 'ofetch'

/**
 * $fetch com URL tipada como string: evita a inferência de rotas tipadas do Nitro
 * (que estoura a profundidade de tipos com rotas dinâmicas) e mantém o retorno tipado.
 */
export function api<T = unknown>(url: string, opts?: FetchOptions<'json'>): Promise<T> {
  return ($fetch as (u: string, o?: FetchOptions<'json'>) => Promise<T>)(url, opts)
}
