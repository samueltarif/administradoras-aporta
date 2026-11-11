import type { ZodType } from 'zod'
import { toast } from 'vue-sonner'
import { fieldErrors } from '#shared/schemas/auth'
import { formatCnpj } from '#shared/utils/cnpj'

export interface RegistryFormState {
  trade_name: string
  legal_name: string
  cnpj: string
  email: string
  phone: string
  address_text: string
  active: boolean
  customer_kind?: string
}

type Source = Partial<Record<keyof RegistryFormState, string | boolean | null>>

export function toFormState(src: Source | null | undefined, withKind: boolean): RegistryFormState {
  const s = (k: keyof RegistryFormState) => (typeof src?.[k] === 'string' ? (src[k] as string) : '')
  return {
    trade_name: s('trade_name'),
    legal_name: s('legal_name'),
    cnpj: formatCnpj(s('cnpj')),
    email: s('email'),
    phone: s('phone'),
    address_text: s('address_text'),
    active: src?.active === undefined || src.active === null ? true : Boolean(src.active),
    ...(withKind ? { customer_kind: s('customer_kind') || 'unclassified' } : {}),
  }
}

/** Valida no cliente (Zod compartilhado), envia ao servidor (que revalida) e trata erros. */
export function useRegistryForm(schema: ZodType, initial: RegistryFormState) {
  const form = reactive<RegistryFormState>({ ...initial })
  const errors = ref<Record<string, string>>({})
  const saving = ref(false)

  async function submit(send: (payload: Record<string, unknown>) => Promise<unknown>, success: string) {
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      errors.value = fieldErrors(parsed.error)
      toast.error('Revise os campos destacados.')
      return false
    }
    errors.value = {}
    saving.value = true
    try {
      await send(parsed.data as Record<string, unknown>)
      toast.success(success)
      return true
    }
    catch (e) {
      toast.error(apiErrorMessage(e))
      return false
    }
    finally {
      saving.value = false
    }
  }

  function reset(next: RegistryFormState) {
    Object.assign(form, next)
    errors.value = {}
  }
  return { form, errors, saving, submit, reset }
}
