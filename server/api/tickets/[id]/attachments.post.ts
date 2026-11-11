import { randomUUID } from 'node:crypto'
import { uuidParam } from '#shared/schemas/registry'
import { serverSupabaseServiceRole } from '#supabase/server'

// Upload privado: valida acesso ao chamado pela RLS, valida o arquivo pelo conteúdo,
// grava no bucket privado com a service role (só no servidor) e registra o anexo sob RLS.
export default defineEventHandler(async (event) => {
  const access = await requireAccess(event)
  const { id } = await getValidatedRouterParams(event, uuidParam.parse)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Selecione um arquivo' })
  if (file.data.length > MAX_ATTACHMENT_BYTES) throw createError({ statusCode: 413, statusMessage: 'Arquivo acima de 10 MB' })
  const type = detectFileType(file.data)
  if (!type) throw createError({ statusCode: 415, statusMessage: 'Envie JPG, PNG, WEBP ou PDF' })
  const wantsInternal = parts?.find(p => p.name === 'visibility')?.data.toString() === 'internal'
  const visibility = wantsInternal && access.staffRole ? 'internal' : 'public'

  const db = await userDb(event)
  const ticket = await db.from('tickets').select('id').eq('id', id).maybeSingle()
  if (ticket.error) dbFail(ticket.error)
  if (!ticket.data) throw createError({ statusCode: 404, statusMessage: 'Chamado não encontrado' })

  const path = `${id}/${randomUUID()}.${type.ext}`
  const storage = serverSupabaseServiceRole(event).storage.from(ATTACHMENT_BUCKET)
  const up = await storage.upload(path, file.data, { contentType: type.mime, upsert: false })
  if (up.error) throw createError({ statusCode: 502, statusMessage: 'Falha ao armazenar o arquivo' })

  const { data, error } = await db.from('ticket_attachments').insert({
    ticket_id: id, uploaded_by: access.userId, object_path: path,
    file_name: safeFileName(file.filename, type.ext), mime_type: type.mime, size_bytes: file.data.length, visibility,
  }).select('id, file_name').single()
  if (error) {
    await storage.remove([path]) // não deixa objeto órfão se o registro for negado
    dbFail(error)
  }
  setResponseStatus(event, 201)
  return data
})
