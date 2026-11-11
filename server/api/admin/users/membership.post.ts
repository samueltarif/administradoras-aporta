import { membershipChangeSchema } from '#shared/schemas/users'

// Concede, reativa ou revoga um vínculo. A revogação vale imediatamente (helpers de RLS conferem "active").
export default defineEventHandler(async (event) => {
  const access = await requireStaff(event, ['owner'])
  const input = await readValidatedBody(event, membershipChangeSchema.parse)
  if (input.user_id === access.userId && input.membership.scope === 'staff' && !input.active) {
    throw createError({ statusCode: 422, statusMessage: 'Você não pode revogar o próprio acesso de proprietário' })
  }
  await setMembership(event, input.user_id, input.membership, input.active)
  return { ok: true }
})
