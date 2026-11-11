// Validação de anexos pelo conteúdo (assinatura binária), não pelo nome ou tipo informado.
const SIGNATURES: { mime: string, ext: string, test: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', ext: 'jpg', test: b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { mime: 'image/png', ext: 'png', test: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) },
  { mime: 'image/webp', ext: 'webp', test: b => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { mime: 'application/pdf', ext: 'pdf', test: b => b.subarray(0, 5).toString('latin1') === '%PDF-' },
]
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_BUCKET = 'ticket-attachments'

export function detectFileType(data: Buffer) {
  return SIGNATURES.find(s => data.length > 12 && s.test(data)) ?? null
}

export function safeFileName(name: string | undefined, ext: string): string {
  const base = (name ?? 'arquivo').split(/[\\/]/).pop() ?? 'arquivo'
  const clean = base.normalize('NFC').replace(/[^\p{L}\p{N}._ -]/gu, '_').replace(/\.+$/, '').slice(0, 120) || 'arquivo'
  return clean.toLowerCase().endsWith(`.${ext}`) ? clean : `${clean}.${ext}`
}
