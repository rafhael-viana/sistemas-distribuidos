export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const TOKEN_KEY = 'mindsync.token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

// request faz a chamada JSON e converte o corpo {"error": "..."} do backend em ApiError.
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(path, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.')
  }

  const text = await res.text()
  const body = text ? safeJSON(text) : null
  if (!res.ok) {
    const msg = body && typeof body === 'object' && 'error' in body ? String(body.error) : res.statusText
    if (token) checkSession(res.status, msg)
    throw new ApiError(res.status, msg || 'Erro inesperado.')
  }
  return body as T
}

// Mensagens do gateway/serviços que significam que a sessão acabou.
const SESSION_ENDED = ['invalid or expired token', 'user is inactive', 'organization is suspended', 'user not found']

export const SESSION_ENDED_EVENT = 'mindsync:session-ended'

// checkSession avisa o app (AuthContext) para deslogar quando o token expira
// ou o acesso é bloqueado (usuário inativado, empresa suspensa).
function checkSession(status: number, msg: string) {
  if ((status === 401 || status === 403) && SESSION_ENDED.includes(msg)) {
    window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT, { detail: msg }))
  }
}

// download baixa um arquivo autenticado e dispara o "salvar como".
export async function download(path: string, filename: string) {
  const headers = new Headers()
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(path, { headers })
  if (!res.ok) {
    const body = safeJSON(await res.text())
    const msg = body && typeof body === 'object' && 'error' in body ? String(body.error) : res.statusText
    throw new ApiError(res.status, msg)
  }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// query monta a query string ignorando valores vazios.
export function query(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

function safeJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
