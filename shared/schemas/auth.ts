import { z } from 'zod'

const email = z.string().trim().toLowerCase().email('Informe um e-mail válido').max(254)

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha').max(72),
})

export const recoverySchema = z.object({ email })

export const newPasswordSchema = z.object({
  password: z.string()
    .min(10, 'Use pelo menos 10 caracteres')
    .max(72, 'Use no máximo 72 caracteres')
    .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
    .regex(/\d/, 'Inclua ao menos um número'),
  confirm: z.string(),
}).refine(v => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não conferem' })

export type LoginInput = z.infer<typeof loginSchema>
export type NewPasswordInput = z.infer<typeof newPasswordSchema>

/** Primeira mensagem de erro por campo, para exibir nos formulários. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}
