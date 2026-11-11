import { z } from 'zod'

const body = z.object({ ids: z.array(z.uuid()).max(100).optional() })

export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const { ids } = await readValidatedBody(event, body.parse)
  const db = await userDb(event)
  let req = db.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  if (ids?.length) req = req.in('id', ids)
  const { error } = await req
  if (error) dbFail(error)
  return { ok: true }
})
