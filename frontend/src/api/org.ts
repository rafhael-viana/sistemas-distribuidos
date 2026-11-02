import { query, request } from './client'
import type { Role, User } from './auth'

export type Plan = 'starter' | 'business' | 'enterprise'
export type TenantStatus = 'active' | 'trial' | 'suspended'

export interface Tenant {
  id: string
  name: string
  plan: Plan
  status: TenantStatus
  max_users: number
  rate_limit: number
  domains: string[]
  invite_code: string
  created_at: string
  users_count: number
}

export interface Team {
  id: string
  tenant_id: string
  name: string
  created_at: string
  members_count: number
}

export const PLAN_LABEL: Record<Plan, string> = { starter: 'Starter', business: 'Business', enterprise: 'Enterprise' }
export const STATUS_LABEL: Record<TenantStatus, string> = { active: 'Ativo', trial: 'Em trial', suspended: 'Suspenso' }

// ---- empresas (admin) ----

export type TenantInput = Partial<Pick<Tenant, 'id' | 'name' | 'plan' | 'status' | 'max_users' | 'rate_limit' | 'domains' | 'invite_code'>>

export const listTenants = () => request<Tenant[]>('/api/v1/tenants')
export const getTenant = (id: string) => request<Tenant>(`/api/v1/tenants/${id}`)
export const createTenant = (input: TenantInput) =>
  request<Tenant>('/api/v1/tenants', { method: 'POST', body: JSON.stringify(input) })
export const updateTenant = (id: string, input: TenantInput) =>
  request<Tenant>(`/api/v1/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteTenant = (id: string) => request<void>(`/api/v1/tenants/${id}`, { method: 'DELETE' })

// ---- equipes (gestão da própria empresa; admin informa tenant_id) ----

export const listTeams = (tenantId?: string) => request<Team[]>(`/api/v1/teams${query({ tenant_id: tenantId })}`)
export const createTeam = (name: string, tenantId?: string) =>
  request<Team>('/api/v1/teams', { method: 'POST', body: JSON.stringify({ name, tenant_id: tenantId || undefined }) })
export const updateTeam = (id: string, name: string) =>
  request<Team>(`/api/v1/teams/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) })
export const deleteTeam = (id: string) => request<void>(`/api/v1/teams/${id}`, { method: 'DELETE' })

// ---- usuários ----

export interface UserFilter {
  tenantId?: string
  teamId?: string
  role?: Role | ''
  q?: string
}

export const listUsers = (f: UserFilter = {}) =>
  request<User[]>(`/api/v1/users${query({ tenant_id: f.tenantId, team_id: f.teamId, role: f.role, q: f.q })}`)

export interface CreateUserInput {
  name: string
  username: string
  email: string
  password: string
  role: Role
  team_id?: string
  tenant_id?: string
}

export const createUser = (input: CreateUserInput) =>
  request<User>('/api/v1/users', { method: 'POST', body: JSON.stringify(input) })

export interface UpdateUserInput {
  name?: string
  role?: Role
  team_id?: string
  active?: boolean
  password?: string
}

export const updateUser = (id: string, input: UpdateUserInput) =>
  request<User>(`/api/v1/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteUser = (id: string) => request<void>(`/api/v1/users/${id}`, { method: 'DELETE' })

// Traduz as mensagens de erro de gestão vindas do backend.
export function translateOrgError(msg: string) {
  const map: Record<string, string> = {
    'email already in use': 'Este e-mail já está cadastrado.',
    'username already in use': 'Este nome de usuário já está em uso.',
    'team name already in use': 'Já existe uma equipe com esse nome.',
    'tenant id already in use': 'Já existe uma empresa com esse identificador.',
    'invite code already in use': 'Esse código de convite já é usado por outra empresa.',
    'organization user limit reached': 'A empresa atingiu o limite de colaboradores do plano.',
    'organization still has users': 'Remova os usuários da empresa antes de excluí-la.',
    'organization is suspended': 'A empresa está suspensa.',
    'email domain not allowed for this organization': 'O domínio deste e-mail não é permitido pela empresa.',
    'team not found in this organization': 'Equipe não encontrada nesta empresa.',
    'you cannot change your own role': 'Você não pode alterar o seu próprio perfil.',
    'you cannot deactivate yourself': 'Você não pode inativar a própria conta.',
    'you cannot delete yourself': 'Você não pode excluir a própria conta.',
    'admin accounts are managed separately': 'Contas de administrador não são alteradas por aqui.',
    'password must have at least 8 characters': 'A senha precisa ter pelo menos 8 caracteres.',
    'invalid email': 'E-mail inválido.',
    "username must not contain spaces or '@'": "O nome de usuário não pode ter espaços ou '@'.",
    'name is required': 'Informe o nome.',
    'tenant_id is required': 'Selecione uma empresa.',
    forbidden: 'Você não tem permissão para esta ação.',
  }
  if (msg.startsWith('invalid domain: ')) return `Domínio inválido: ${msg.slice(16)}`
  return map[msg] ?? msg
}
