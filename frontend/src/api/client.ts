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
    throw new ApiError(res.status, msg || 'Erro inesperado.')
  }
  return body as T
}

function safeJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
