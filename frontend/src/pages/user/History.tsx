import { useState } from 'react'
import { Info } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { UserHeaderRight } from '../../components/UserHeaderRight'
import { LineChart } from '../../components/LineChart'
import { INDICATORS, levelOf, loadHistory, type IndicatorId } from '../../data/checkin'

type Period = 'week' | 'month' | 'quarter'

// Séries de exemplo (escala 1–5, maior = mais favorável), mostradas enquanto o
// indicador tem menos de duas respostas no período.
const SAMPLE: Record<IndicatorId, number[]> = {
  estresse: [2.7, 2.9, 3.0, 3.3, 3.0, 3.4, 3.3],
  bemEstar: [3.6, 3.8, 3.7, 4.0, 4.1, 4.2, 4.2],
  equilibrio: [3.2, 3.0, 3.1, 3.3, 3.4, 3.3, 3.5],
  psicossocial: [],
  recuperacao: [2.8, 2.9, 2.6, 2.9, 3.0, 3.1, 3.2],
  sedentarismo: [2.0, 2.5, 2.5, 3.0, 2.5, 3.0, 3.5],
}
const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, quarter: 90 }

const PERIOD_LABELS: Record<Period, string> = { week: 'Última semana', month: 'Último mês', quarter: 'Últimos 3 meses' }

export function History() {
  const [period, setPeriod] = useState<Period>('month')
  const last = (xs: number[]) => xs[xs.length - 1]!
  const since = Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000
  const history = loadHistory().filter((e) => new Date(e.at).getTime() >= since)

  // Fatores psicossociais só aparecem de forma agregada (Quadro 2).
  const cards = INDICATORS.filter((ind) => ind.scope === 'individual').map((ind) => {
    const real = history.map((e) => e.scores[ind.id]?.value).filter((v): v is number => v !== undefined)
    const sample = real.length < 2
    const data = sample ? SAMPLE[ind.id] : real
    const lv = levelOf(last(data))
    return {
      title: ind.name,
      sub: `Coleta ${ind.periodLabel.toLowerCase()}${sample ? ' · valores de exemplo' : ` · ${real.length} respostas`}`,
      data,
      color: lv === 'favoravel' ? 'var(--green)' : lv === 'moderado' ? 'var(--orange)' : 'var(--red)',
    }
  })

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
          Sua jornada é única. Esses gráficos mostram a variação do seu bem-estar pessoal e não servem como comparação externa ou diagnósticos formais. Use-os para identificar padrões pessoais de estresse e descanso. Em todos os gráficos, 5 é a situação mais favorável.
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
            <div className="chart-axis"><span>Mais antigo</span><span>Mais recente</span></div>
          </div>
        ))}
      </div>
    </>
  )
}
