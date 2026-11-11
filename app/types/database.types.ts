// Tipos do banco do portal (projeto rluzszruexjxkgrylvjd), derivados de `supabase gen types` em 05/11/2026.
// Formato compacto com uniões de enum mais estritas. Regenerar o oficial: npm run db:types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel<N extends string, C extends string, T extends string, R extends string, O extends boolean = false> = {
  foreignKeyName: N, columns: [C], isOneToOne: O, referencedRelation: T, referencedColumns: [R]
}
type Opt<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
type Table<R, I, Rels extends unknown[] = []> = { Row: R, Insert: I, Update: Partial<I>, Relationships: Rels }
type Profile = 'user_profiles'

export type CustomerKind = 'condominium' | 'business' | 'person' | 'unclassified'
export type TicketStatus = 'open' | 'review' | 'scheduled' | 'in_progress' | 'waiting_customer'
  | 'waiting_material' | 'resolved' | 'closed' | 'cancelled'
export type TicketPriority = 'low' | 'normal' | 'high' | 'emergency'
export type TicketCategory = 'gate_stuck' | 'automation' | 'preventive' | 'repair' | 'metalwork' | 'repaint' | 'other'
export type ContractStatus = 'draft' | 'active' | 'suspended' | 'expired' | 'closed'
export type VisitStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual'

type Registry = {
  id: string, legacy_source: string | null, legacy_code: string | null, trade_name: string
  legal_name: string | null, cnpj: string | null, email: string | null, phone: string | null
  address_text: string | null, legacy_status: string | null, active: boolean, created_at: string, updated_at: string
}
type RegistryInsert = Opt<Registry, Exclude<keyof Registry, 'trade_name'>>
type CustomerRow = Registry & { customer_kind: CustomerKind }
type AssignmentRow = {
  id: string, management_company_id: string, customer_id: string, effective_from: string | null
  recorded_at: string, ended_at: string | null, source_system: string
}
type ProfileRow = { user_id: string, display_name: string | null, active: boolean, created_at: string }
type StaffRow = { user_id: string, staff_role: 'owner' | 'operations', active: boolean }
type MgmtMemberRow = { user_id: string, management_company_id: string, member_role: 'manager' | 'attendant', active: boolean }
type CustMemberRow = { user_id: string, customer_id: string, member_role: 'syndic' | 'porter' | 'representative', active: boolean }
type ContractRow = {
  id: string, customer_id: string, contractor_type: 'customer' | 'management', contractor_management_id: string | null
  contract_number: string | null, title: string, description: string | null, starts_on: string | null
  ends_on: string | null, maintenance_frequency: Frequency | null, status: ContractStatus, created_at: string, updated_at: string
}
type FinancialRow = { contract_id: string, monthly_value: number | null, billing_notes: string | null }
type TicketRow = {
  id: string, number: number, customer_id: string, created_by: string, title: string, description: string
  category: TicketCategory, location_detail: string | null, priority: TicketPriority, status: TicketStatus
  assigned_to: string | null, created_at: string, updated_at: string, closed_at: string | null
}
type HistoryRow = { id: number, ticket_id: string, old_status: TicketStatus | null, new_status: TicketStatus, actor_id: string | null, changed_at: string }
type MessageRow = { id: string, ticket_id: string, author_id: string, body: string, created_at: string }
type VisitRow = {
  id: string, customer_id: string, contract_id: string | null, ticket_id: string | null, title: string
  scheduled_for: string | null, completed_at: string | null, status: VisitStatus, assigned_to: string | null
  result_summary: string | null, created_at: string, updated_at: string
}
type AttachmentRow = {
  id: string, ticket_id: string, uploaded_by: string, object_path: string, file_name: string
  mime_type: string | null, size_bytes: number | null, visibility: 'public' | 'internal', created_at: string
}
type AuditRow = { id: number, actor_id: string | null, action: string, entity_name: string, entity_id: string | null, details: Json, created_at: string }
type NotificationRow = {
  id: string, user_id: string, ticket_id: string | null, kind: 'ticket_created' | 'ticket_status' | 'ticket_message'
  title: string, read_at: string | null, created_at: string
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      management_companies: Table<Registry, RegistryInsert>
      customers: Table<CustomerRow, RegistryInsert & { customer_kind?: CustomerKind }>
      management_assignments: Table<AssignmentRow, Opt<AssignmentRow, 'id' | 'effective_from' | 'recorded_at' | 'ended_at' | 'source_system'>, [
        Rel<'management_assignments_customer_id_fkey', 'customer_id', 'customers', 'id'>,
        Rel<'management_assignments_management_company_id_fkey', 'management_company_id', 'management_companies', 'id'>,
      ]>
      user_profiles: Table<ProfileRow, Opt<ProfileRow, 'display_name' | 'active' | 'created_at'>>
      staff_memberships: Table<StaffRow, Opt<StaffRow, 'active'>, [
        Rel<'staff_memberships_user_id_fkey', 'user_id', Profile, 'user_id', true>,
      ]>
      management_memberships: Table<MgmtMemberRow, Opt<MgmtMemberRow, 'active'>, [
        Rel<'management_memberships_management_company_id_fkey', 'management_company_id', 'management_companies', 'id'>,
        Rel<'management_memberships_user_id_fkey', 'user_id', Profile, 'user_id'>,
      ]>
      customer_memberships: Table<CustMemberRow, Opt<CustMemberRow, 'active'>, [
        Rel<'customer_memberships_customer_id_fkey', 'customer_id', 'customers', 'id'>,
        Rel<'customer_memberships_user_id_fkey', 'user_id', Profile, 'user_id'>,
      ]>
      service_contracts: Table<ContractRow, Opt<ContractRow, 'id' | 'contractor_management_id' | 'contract_number' | 'description'
        | 'starts_on' | 'ends_on' | 'maintenance_frequency' | 'status' | 'created_at' | 'updated_at'>, [
        Rel<'service_contracts_contractor_management_id_fkey', 'contractor_management_id', 'management_companies', 'id'>,
        Rel<'service_contracts_customer_id_fkey', 'customer_id', 'customers', 'id'>,
      ]>
      contract_financials: Table<FinancialRow, Opt<FinancialRow, 'monthly_value' | 'billing_notes'>, [
        Rel<'contract_financials_contract_id_fkey', 'contract_id', 'service_contracts', 'id', true>,
      ]>
      tickets: Table<TicketRow, Opt<Omit<TicketRow, 'number'>, 'id' | 'category' | 'location_detail' | 'priority' | 'status'
        | 'assigned_to' | 'created_at' | 'updated_at' | 'closed_at'>, [
        Rel<'tickets_assigned_to_fkey', 'assigned_to', Profile, 'user_id'>,
        Rel<'tickets_created_by_fkey', 'created_by', Profile, 'user_id'>,
        Rel<'tickets_customer_id_fkey', 'customer_id', 'customers', 'id'>,
      ]>
      ticket_status_history: Table<HistoryRow, Opt<Omit<HistoryRow, 'id'>, 'old_status' | 'actor_id' | 'changed_at'>, [
        Rel<'ticket_status_history_actor_id_fkey', 'actor_id', Profile, 'user_id'>,
        Rel<'ticket_status_history_ticket_id_fkey', 'ticket_id', 'tickets', 'id'>,
      ]>
      ticket_messages: Table<MessageRow, Opt<MessageRow, 'id' | 'created_at'>, [
        Rel<'ticket_messages_author_id_fkey', 'author_id', Profile, 'user_id'>,
        Rel<'ticket_messages_ticket_id_fkey', 'ticket_id', 'tickets', 'id'>,
      ]>
      ticket_internal_notes: Table<MessageRow, Opt<MessageRow, 'id' | 'created_at'>, [
        Rel<'ticket_internal_notes_author_id_fkey', 'author_id', Profile, 'user_id'>,
        Rel<'ticket_internal_notes_ticket_id_fkey', 'ticket_id', 'tickets', 'id'>,
      ]>
      technical_visits: Table<VisitRow, Opt<VisitRow, 'id' | 'contract_id' | 'ticket_id' | 'scheduled_for' | 'completed_at'
        | 'status' | 'assigned_to' | 'result_summary' | 'created_at' | 'updated_at'>, [
        Rel<'technical_visits_assigned_to_fkey', 'assigned_to', Profile, 'user_id'>,
        Rel<'technical_visits_contract_id_fkey', 'contract_id', 'service_contracts', 'id'>,
        Rel<'technical_visits_customer_id_fkey', 'customer_id', 'customers', 'id'>,
        Rel<'technical_visits_ticket_id_fkey', 'ticket_id', 'tickets', 'id'>,
      ]>
      ticket_attachments: Table<AttachmentRow, Opt<AttachmentRow, 'id' | 'mime_type' | 'size_bytes' | 'visibility' | 'created_at'>, [
        Rel<'ticket_attachments_ticket_id_fkey', 'ticket_id', 'tickets', 'id'>,
        Rel<'ticket_attachments_uploaded_by_fkey', 'uploaded_by', Profile, 'user_id'>,
      ]>
      audit_events: Table<AuditRow, Opt<Omit<AuditRow, 'id'>, 'actor_id' | 'entity_id' | 'details' | 'created_at'>, [
        Rel<'audit_events_actor_id_fkey', 'actor_id', Profile, 'user_id'>,
      ]>
      notifications: Table<NotificationRow, Opt<NotificationRow, 'id' | 'ticket_id' | 'read_at' | 'created_at'>, [
        Rel<'notifications_ticket_id_fkey', 'ticket_id', 'tickets', 'id'>,
        Rel<'notifications_user_id_fkey', 'user_id', Profile, 'user_id'>,
      ]>
    }
    Views: { [_ in never]: never }
    Functions: {
      admin_set_customer_management: { Args: { p_customer: string, p_management: string | null, p_effective_from?: string }, Returns: string }
      customer_ticket_action: { Args: { p_ticket: string, p_action: string, p_comment?: string }, Returns: string }
      ticket_people: { Args: { p_ticket: string }, Returns: { user_id: string, display_name: string }[] }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
