import { useState } from 'react'
import { Info } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { UserHeaderRight } from '../../components/UserHeaderRight'
import { LineChart } from '../../components/LineChart'

type Period = 'week' | 'month' | 'quarter'

const SERIES: Record<Period, Record<string, number[]>> = {
  week: { mental: [4.0, 4.1, 4.3, 4.2, 4.2, 4.3, 4.2], stress: [2.7, 2.6, 2.6, 2.5, 2.5, 2.4, 2.5], load: [3.9, 4.0, 3.8, 3.8, 3.7, 3.8, 3.8], tech: [4.5, 4.6, 4.6, 4.6, 4.7, 4.6, 4.6] },
  month: { mental: [4.0, 3.9, 4.3, 4.2, 4.1, 4.2, 4.2], stress: [2.8, 2.9, 2.6, 2.5, 2.6, 2.4, 2.4], load: [3.9, 3.8, 4.1, 3.8, 3.7, 3.7, 3.7], tech: [4.5, 4.5, 4.6, 4.7, 4.6, 4.6, 4.6] },
  quarter: { mental: [3.6, 3.8, 3.7, 4.0, 4.1, 4.2, 4.2], stress: [3.2, 3.0, 3.1, 2.8, 2.6, 2.5, 2.5], load: [4.2, 4.1, 4.0, 3.9, 3.8, 3.8, 3.8], tech: [4.2, 4.3, 4.4, 4.5, 4.5, 4.6, 4.6] },
}

const PERIOD_LABELS: Record<Period, string> = { week: 'Última semana', month: 'Último mês', quarter: 'Últimos 3 meses' }

export function History() {
  const [period, setPeriod] = useState<Period>('month')
  const s = SERIES[period]
  const last = (xs: number[]) => xs[xs.length - 1]!

  const cards = [
    { title: 'Equilíbrio Mental (Bem-estar)', sub: 'Nível saudável de foco e paz', data: s.mental!, color: 'var(--green)' },
    { title: 'Estresse Percebido', sub: 'Estável, sob controle moderado', data: s.stress!, color: 'var(--orange)' },
    { title: 'Carga de Trabalho', sub: 'Demanda ainda elevada na semana', data: s.load!, color: 'var(--orange)' },
    { title: 'Estresse de Tecnologia (Technostress)', sub: 'Excelente adaptação aos sistemas', data: s.tech!, color: 'var(--green)' },
  ]

  function exportPDF() {
    window.print()
  }

  return (
    <>
      <PageHeader title="Histórico de Bem-estar" subtitle="Acompanhe sua evolução e desenvolva autoconhecimento" right={<UserHeaderRight />} />

      <div className="row between">
        <div className="segmented">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button key={p} className={p === period ? 'active' : ''} onClick={() => setPeriod(p)}>{PERIOD_LABELS[p]}</button>
          ))}
        </div>
        <button className="btn btn-outline btn-sm" onClick={exportPDF}>Exportar Dados (.PDF)</button>
      </div>

      <div className="row gap-12 mt-16 small" style={{ background: 'var(--primary-50)', color: 'var(--primary)', borderRadius: 10, padding: '12px 14px', alignItems: 'flex-start' }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ lineHeight: 1.5 }}>
          Sua jornada é única. Esses gráficos mostram a variação do seu bem-estar pessoal e não servem como comparação externa ou diagnósticos formais. Use-os para identificar padrões pessoais de estresse e descanso.
        </span>
      </div>

      <div className="grid grid-2 mt-16">
        {cards.map((c) => (
          <div key={c.title} className="card">
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.title}</div>
                <div className="xs muted">{c.sub}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{last(c.data).toFixed(1)} / 5</div>
            </div>
            <div className="mt-12" style={{ maxWidth: '75%' }}>
              <LineChart values={c.data} max={5} height={60} dot />
            </div>
            <div className="chart-axis"><span>Seg</span><span>Qua</span><span>Sex</span><span>Dom</span></div>
          </div>
        ))}
      </div>
    </>
  )
}
