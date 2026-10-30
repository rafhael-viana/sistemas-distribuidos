import { request } from './client'

export interface AuditEntry {
  event_id: string
  type: string
  source: string
  occurred_at: string
  data: Record<string, unknown> | null
  recorded_at: string
}

export function listAuditEvents() {
  return request<AuditEntry[] | null>('/api/v1/audit/events').then((r) => r ?? [])
}
