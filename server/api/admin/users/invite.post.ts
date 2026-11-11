import { inviteSchema } from '#shared/schemas/users'
import { serverSupabaseServiceRole } from '#supabase/server'

// Convite: o acesso nasce de uma decisão do proprietário, nunca de contatos importados.
export default defineEventHandler(async (event) => {
  await requireStaff(event, ['owner'])
  const input = await readValidatedBody(event, inviteSchema.parse)
  const admin = serverSupabaseServiceRole(event).auth.admin
  const origin = getRequestURL(event).origin
  let userId: string | undefined
  const invited = await admin.inviteUserByEmail(input.email, {
    data: { full_name: input.full_name }, redirectTo: `${origin}/confirmar`,
  })
  if (invited.data?.user) userId = invited.data.user.id
  else if (invited.error?.code === 'email_exists' || invited.error?.status === 422) {
    const list = await admin.listUsers({ perPage: 1000 })
    userId = list.data?.users.find(u => u.email?.toLowerCase() === input.email)?.id
  }
  if (!userId) {
    const msg = invited.error?.status === 429 ? 'Limite de e-mails do Supabase atingido; tente mais tarde.' : 'Não foi possível enviar o convite.'
    throw createError({ statusCode: 502, statusMessage: msg })
  }
  await setMembership(event, userId, input.membership, true)
  setResponseStatus(event, 201)
  return { userId, emailSent: Boolean(invited.data?.user) }
})
