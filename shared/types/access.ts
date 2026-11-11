export type StaffRole = 'owner' | 'operations'
export type ManagementRole = 'manager' | 'attendant'
export type CustomerRole = 'syndic' | 'porter' | 'representative'

export interface ManagementAccess { id: string, name: string, role: ManagementRole }
export interface CustomerAccess { id: string, name: string, role: CustomerRole }

/** Contexto de acesso calculado no servidor a partir das tabelas de vínculo (RLS). */
export interface AccessContext {
  userId: string
  email: string | null
  displayName: string | null
  active: boolean
  staffRole: StaffRole | null
  managements: ManagementAccess[]
  customers: CustomerAccess[]
}

/** Rota inicial adequada ao perfil. Apenas navegação: a autorização é do banco. */
export function homePathFor(access: AccessContext | null): string {
  if (!access) return '/login'
  if (!access.active) return '/sem-acesso'
  if (access.staffRole) return '/admin'
  if (access.managements.length || access.customers.length) return '/portal'
  return '/sem-acesso'
}
