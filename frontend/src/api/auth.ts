import { request } from './client'

export type Role = 'profissional' | 'gestao' | 'admin'

export interface User {
  id: string
  name: string
  username: string
  email: string
  // Contas salvas antes da criação dos perfis não têm role: valem como profissional.
  role?: Role
  tenant_id?: string
  team_id?: string
  active?: boolean
  created_at: string
}

export interface AuthResult {
  token: string
  expires_at: string
  user: User
}

export interface RegisterInput {
  name: string
  username: string
  email: string
  password: string
  invite_code?: string
}

export function login(login: string, password: string) {
  return request<AuthResult>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  })
}

export function me() {
  return request<User>('/api/v1/auth/me')
}

export function register(input: RegisterInput) {
  return request<User>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// Mensagens do backend vêm em inglês; aqui viram texto para o usuário.
export function translateAuthError(msg: string) {
  const map: Record<string, string> = {
    'invalid credentials': 'Usuário ou senha inválidos.',
    'invalid email': 'E-mail inválido.',
    'name is required': 'Informe seu nome.',
    'username is required': 'Informe um nome de usuário.',
    "username must not contain spaces or '@'": "O nome de usuário não pode ter espaços ou '@'.",
    'password must have at least 8 characters': 'A senha precisa ter pelo menos 8 caracteres.',
    'password must have at most 72 bytes': 'A senha é longa demais.',
    'email already in use': 'Este e-mail já está cadastrado.',
    'username already in use': 'Este nome de usuário já está em uso.',
    'user is inactive': 'Sua conta está inativa. Procure o RH da sua empresa.',
    'organization is suspended': 'O acesso da sua empresa está suspenso.',
    'organization user limit reached': 'Sua empresa atingiu o limite de colaboradores do plano.',
    'invalid invite code': 'Código de convite inválido.',
    'no organization for this email domain: use an invite code':
      'Nenhuma empresa usa o domínio deste e-mail. Informe o código de convite.',
    'email domain not allowed for this organization': 'O domínio deste e-mail não é permitido pela sua empresa.',
    'invalid or expired token': 'Sua sessão expirou. Entre novamente.',
  }
  return map[msg] ?? msg
}
