import { request } from './client'

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
  created_at: string
  completed_at?: string
}

export function requestReport(type: ReportType, format: ReportFormat) {
  return request<Report>('/api/v1/reports', {
    method: 'POST',
    body: JSON.stringify({ type, format }),
  })
}

export function listReports() {
  return request<Report[] | null>('/api/v1/reports').then((r) => r ?? [])
}

export function getReport(id: string) {
  return request<Report>(`/api/v1/reports/${id}`)
}

export function downloadURL(id: string) {
  return `/api/v1/reports/${id}/download`
}
