import { query, request } from './client'

export interface AuditEntry {
  event_id: string
  type: string
  source: string
  tenant_id?: string
  correlation_id?: string
  occurred_at: string
  data: Record<string, unknown> | null
  recorded_at: string
}

export function listAuditEvents(tenantId?: string) {
  return request<AuditEntry[] | null>(`/api/v1/audit/events${query({ tenant_id: tenantId })}`).then((r) => r ?? [])
}

export type LogLevel = 'info' | 'warn' | 'error' | 'critical'

export interface LogEntry {
  id: string
  request_id: string
  service: string
  level: LogLevel
  kind: 'http' | 'event' | 'job'
  message: string
  method?: string
  path?: string
  status?: number
  duration_ms: number
  user_id?: string
  error?: string
  stack?: string
  occurred_at: string
}

export interface LogPage {
  items: LogEntry[]
  total: number
  counts: Partial<Record<LogLevel, number>>
}

export interface LogFilter {
  levels: LogLevel[]
  service: string
  q: string
  since: string // duração aceita pelo backend: 1h, 24h, 168h
  limit: number
  offset: number
}

export function listLogs(f: LogFilter) {
  return request<LogPage>(
    `/api/v1/audit/logs${query({ level: f.levels.join(','), service: f.service, q: f.q, since: f.since, limit: f.limit, offset: f.offset })}`,
  )
}

export function traceRequest(requestId: string) {
  return request<LogEntry[]>(`/api/v1/audit/logs/trace/${encodeURIComponent(requestId)}`)
}

export interface Component {
  name: string
  kind: 'gateway' | 'service' | 'broker' | 'database'
  address: string
  status: 'up' | 'down' | 'disabled'
  latency_ms: number
  detail?: string
}

export function systemStatus() {
  return request<{ checked_at: string; components: Component[] }>('/api/v1/system/status')
}
