import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { setToken } from '../api/client'

const USER_KEY = 'mindsync.user'
const ONBOARDING_KEY = 'mindsync.onboarding'

interface AuthContextValue {
  user: authApi.User | null
  onboarded: boolean
  login: (login: string, password: string, remember: boolean) => Promise<authApi.User>
  register: (input: authApi.RegisterInput) => Promise<void>
  logout: () => void
  finishOnboarding: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadUser(): authApi.User | null {
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)
  try {
    return raw ? (JSON.parse(raw) as authApi.User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(loadUser)
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARDING_KEY) === '1')

  const login = useCallback(async (login: string, password: string, remember: boolean) => {
    const res = await authApi.login(login, password)
    setToken(res.token)
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(USER_KEY, JSON.stringify(res.user))
    setUser(res.user)
    return res.user
  }, [])

  // O cadastro não devolve token, então logamos logo em seguida.
  const register = useCallback(
    async (input: authApi.RegisterInput) => {
      await authApi.register(input)
      localStorage.removeItem(ONBOARDING_KEY)
      setOnboarded(false)
      await login(input.email, input.password, true)
    },
    [login],
  )

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const finishOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setOnboarded(true)
  }, [])

  const value = useMemo(
    () => ({ user, onboarded, login, register, logout, finishOnboarding }),
    [user, onboarded, login, register, logout, finishOnboarding],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name
}

export type Area = 'app' | 'gestao' | 'clientes' | 'dev'

const AREAS: Record<authApi.Role, Area[]> = {
  profissional: ['app'],
  gestao: ['gestao', 'clientes'],
  admin: ['gestao', 'clientes', 'dev', 'app'],
}

export const ROLE_LABEL: Record<authApi.Role, string> = {
  profissional: 'Profissional',
  gestao: 'Gestão de RH',
  admin: 'Administrador',
}

export function roleOf(user: authApi.User | null): authApi.Role {
  return user?.role ?? 'profissional'
}

export function canAccess(user: authApi.User | null, area: Area) {
  return AREAS[roleOf(user)].includes(area)
}

// Página inicial de cada perfil após o login.
export function homeFor(user: authApi.User | null, onboarded: boolean) {
  const role = roleOf(user)
  if (role === 'profissional') return onboarded ? '/app' : '/onboarding'
  return '/gestao'
}
