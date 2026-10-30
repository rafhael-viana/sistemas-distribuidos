import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  right?: ReactNode
  before?: ReactNode
}

export function PageHeader({ title, subtitle, right, before }: PageHeaderProps) {
  return (
    <div className="page-head">
      <div>
        {before}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right && <div className="right">{right}</div>}
    </div>
  )
}
