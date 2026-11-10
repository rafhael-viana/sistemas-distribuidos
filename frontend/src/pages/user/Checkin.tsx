import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { UserHeaderRight } from '../../components/UserHeaderRight'
import { AGREEMENT, dueIndicators, indicator, INDICATORS, loadHistory, saveCheckin, type IndicatorId, type RawAnswers } from '../../data/checkin'

const DRAFT_KEY = 'mindsync.checkinDraft.v2'

interface Draft {
  ids: IndicatorId[]
  stage: number
  answers: RawAnswers
}

// Só os indicadores vencidos pela periodicidade do Quadro 2 entram no check-in.
// Com ?todos=1, pergunta os seis (útil para demonstração).
function newDraft(all: boolean): Draft {
  const due = all ? INDICATORS : dueIndicators(loadHistory())
  return { ids: due.map((i) => i.id), stage: 0, answers: Object.fromEntries(due.map((i) => [i.id, i.items.map(() => 0)])) }
}

function loadDraft(all: boolean): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw && !all) {
      const d = JSON.parse(raw) as Draft
      if (d.ids?.length && d.ids.every((id) => INDICATORS.some((i) => i.id === id))) return d
    }
  } catch {
    // rascunho inválido: começa do zero
  }
  return newDraft(all)
}

export function Checkin() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const all = params.has('todos')
  const [{ ids, stage, answers }, setState] = useState(() => loadDraft(all))

  if (ids.length === 0) {
    return (
      <>
        <PageHeader title="Check-in Periódico" subtitle="Nenhum indicador pendente" right={<UserHeaderRight />} />
        <div className="card">
          <p className="small muted" style={{ lineHeight: 1.6 }}>
            Você já respondeu todos os indicadores dentro da periodicidade prevista. Estresse ocupacional e comportamento
            sedentário são perguntados toda semana; bem-estar e recuperação, a cada 15 dias; equilíbrio vida–trabalho e
            fatores psicossociais, uma vez por mês.
          </p>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/app/checkin/devolutiva')}>Ver devolutiva</button>
        </div>
      </>
    )
  }

  const current = indicator(ids[stage]!)
  const row = answers[current.id]!
  const total = ids.length
  const progress = Math.round(((stage + 1) / total) * 100)
  const complete = row.every((v) => v > 0)

  function answer(q: number, value: number) {
    setState((s) => ({ ...s, answers: { ...s.answers, [current.id]: s.answers[current.id]!.map((v, j) => (j === q ? value : v)) } }))
  }

  function saveForLater() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ids, stage, answers }))
    } catch {
      // sem armazenamento: o rascunho se perde
    }
    navigate('/app')
  }

  function next() {
    if (stage < total - 1) {
      setState({ ids, stage: stage + 1, answers })
      return
    }
    saveCheckin(answers)
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      // ignora
    }
    navigate('/app/checkin/devolutiva')
  }

  return (
    <>
      <PageHeader title="Check-in Periódico" subtitle="Como está sua relação com o trabalho?" right={<UserHeaderRight />} />

      <div className="card">
        <div className="row between">
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            Etapa {stage + 1} de {total} — {current.name}
          </div>
          <div className="small" style={{ color: 'var(--primary)', fontWeight: 600 }}>{progress}% Concluído</div>
        </div>
        <div className="progress mt-12"><div style={{ width: `${progress}%` }} /></div>
        <p className="xs muted mt-12">
          {current.recall} Coleta {current.periodLabel.toLowerCase()}. Seus dados são confidenciais e protegidos pela LGPD.
        </p>
      </div>

      <div className="card mt-16" style={{ padding: '4px 20px' }}>
        {current.items.map((q, i) => (
          <div key={q.text} style={{ padding: '18px 0', borderTop: i ? '1px solid var(--border)' : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {q.text}</div>
            {q.options ? (
              <div className="row gap-8 mt-12" style={{ flexWrap: 'wrap' }}>
                {q.options.map((o) => (
                  <button key={o.label} className={`chip${row[i] === o.value ? ' active' : ''}`} onClick={() => answer(i, o.value)}>{o.label}</button>
                ))}
              </div>
            ) : (
              <div className="question" style={{ padding: '10px 0 0' }}>
                <span className="xs muted">{AGREEMENT[0]}</span>
                <div className="scale" style={{ justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button key={v} title={AGREEMENT[v - 1]} className={row[i] === v ? 'active' : ''} onClick={() => answer(i, v)}>{v}</button>
                  ))}
                </div>
                <span className="xs muted" style={{ textAlign: 'right' }}>{AGREEMENT[4]}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="xs muted mt-8">Instrumento: {current.instrument}.</p>

      <div className="row between mt-16">
        <button className="btn btn-ghost" onClick={saveForLater}>Salvar e continuar depois</button>
        <div className="row gap-8">
          <button className="btn btn-outline" disabled={stage === 0} onClick={() => setState({ ids, stage: stage - 1, answers })}>Voltar</button>
          <button className="btn btn-primary" disabled={!complete} onClick={next}>{stage === total - 1 ? 'Concluir' : 'Próximo'}</button>
        </div>
      </div>
    </>
  )
}
