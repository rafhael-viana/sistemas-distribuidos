import { download, query, request } from './client'

export type ReportType = 'users' | 'logins'
export type ReportFormat = 'pdf' | 'csv'
export type ReportStatus = 'pending' | 'done' | 'failed'

export interface Report {
  id: string
  type: ReportType
  format: ReportFormat
  status: ReportStatus
  error?: string
  size?: number
  tenant_id?: string
  team_ids?: string[]
  requested_by?: string
  created_at: string
  completed_at?: string
}

export interface ReportRequest {
  type: ReportType
  format: ReportFormat
  team_ids?: string[]
  tenant_id?: string
}

export function requestReport(input: ReportRequest) {
  return request<Report>('/api/v1/reports', { method: 'POST', body: JSON.stringify(input) })
}

export function listReports(tenantId?: string) {
  return request<Report[] | null>(`/api/v1/reports${query({ tenant_id: tenantId })}`).then((r) => r ?? [])
}

export function getReport(id: string) {
  return request<Report>(`/api/v1/reports/${id}`)
}

export function downloadReport(r: Report) {
  return download(`/api/v1/reports/${r.id}/download`, `${r.type}-${r.id}.${r.format}`)
}
