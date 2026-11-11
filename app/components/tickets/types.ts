import type { TicketCategory, TicketPriority, TicketStatus } from '~/types/database.types'

export interface TicketDetail {
  ticket: {
    id: string, number: number, title: string, description: string, category: TicketCategory, priority: TicketPriority
    status: TicketStatus, location_detail: string | null, created_by: string, assigned_to: string | null
    created_at: string, closed_at: string | null, customers: { id: string, trade_name: string } | null
  }
  history: { id: number, old_status: TicketStatus | null, new_status: TicketStatus, actor_id: string | null, changed_at: string }[]
  messages: { id: string, author_id: string, body: string, created_at: string }[]
  notes: { id: string, author_id: string, body: string, created_at: string }[]
  attachments: { id: string, file_name: string, mime_type: string | null, size_bytes: number | null, visibility: 'public' | 'internal', created_at: string }[]
  visits: { id: string, title: string, scheduled_for: string | null, status: string }[]
  names: Record<string, string>
  isStaff: boolean
  isOwnTicket: boolean
}
