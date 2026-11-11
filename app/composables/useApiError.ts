import { FetchError } from 'ofetch'

/** Mensagem amigável a partir de um erro de $fetch/useFetch. */
export function apiErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof FetchError) {
    if (error.statusCode === 400) return 'Revise os campos destacados.'
    if (error.statusCode === 401) return 'Sua sessão expirou. Entre novamente.'
    return error.data?.statusMessage || error.statusMessage || fallback
  }
  return fallback
}
