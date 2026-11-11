import { uuidParam } from '#shared/schemas/registry'
import { serverSupabaseServiceRole } from '#supabase/server'

// Download: a RLS de ticket_attachments decide se o usuário vê o anexo; a URL assinada dura 60 s.
export default defineEventHandler(async (event) => {
  await requireAccess(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const db = await userDb(event)
  const { data, error } = await db.from('ticket_attachments').select('object_path, file_name').eq('id', id).maybeSingle()
  if (error) dbFail(error)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Anexo não encontrado' })
  const signed = await serverSupabaseServiceRole(event).storage.from(ATTACHMENT_BUCKET)
    .createSignedUrl(data.object_path, 60, { download: data.file_name })
  if (signed.error || !signed.data) throw createError({ statusCode: 502, statusMessage: 'Falha ao gerar o link do anexo' })
  setHeader(event, 'Cache-Control', 'no-store')
  return sendRedirect(event, signed.data.signedUrl, 302)
})
