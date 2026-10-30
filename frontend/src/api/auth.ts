import { request } from './client'

export interface User {
  id: string
  name: string
  username: string
  email: string
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
}

export function login(login: string, password: string) {
  return request<AuthResult>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  })
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
  }
  return map[msg] ?? msg
}
