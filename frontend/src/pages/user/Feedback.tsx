import { Info, Lightbulb } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { UserHeaderRight } from '../../components/UserHeaderRight'
import { firstName, useAuth } from '../../context/AuthContext'
import { INDICATORS, latestByIndicator, levelOf, loadHistory, SAMPLE_LATEST, type IndicatorId, type LevelKind } from '../../data/checkin'

const LEVEL: Record<LevelKind, { badge: string; color: string; label?: string }> = {
  favoravel: { badge: 'badge-green', color: 'var(--green)' },
  moderado: { badge: 'badge-orange', color: 'var(--orange)', label: 'Moderado' },
  atencao: { badge: 'badge-red', color: 'var(--red)', label: 'Atenção' },
}

// Orientações educativas, sem caráter clínico, para o indicador menos favorável.
const TIPS: Record<IndicatorId, string> = {
  estresse:
    'Seu estresse percebido no trabalho esteve elevado. Tente identificar quais demandas mais pesaram nesta semana e, se possível, converse com sua liderança sobre prioridades e prazos.',
  bemEstar:
    'Seu bem-estar ficou abaixo do habitual. Reserve momentos para atividades que recarregam sua energia e para o contato com pessoas próximas.',
  equilibrio:
    'O trabalho parece ter ocupado espaço da sua vida pessoal. Combinar horários de início e fim do expediente e desativar notificações fora deles pode ajudar.',
  psicossocial: '',
  recuperacao:
    'Sua recuperação após o trabalho está difícil. Um ritual de encerramento do expediente (revisar o que ficou para amanhã e fechar as ferramentas) ajuda a se desligar.',
  sedentarismo:
    'Você tem passado muito tempo sentado(a). Levante-se e movimente-se por alguns minutos a cada hora; reuniões em pé ou caminhando também contam.',
}

export function Feedback() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const real = latestByIndicator(loadHistory())
  const sample = Object.keys(real).length === 0
  const latest = sample ? SAMPLE_LATEST : real

  // A devolutiva mostra só os indicadores de uso individual (Quadro 2).
  const shown = INDICATORS.filter((ind) => ind.scope === 'individual' && latest[ind.id])
  const attention = shown.filter((ind) => levelOf(latest[ind.id]!.score.value) !== 'favoravel')
  const worst = [...shown].sort((a, b) => latest[a.id]!.score.value - latest[b.id]!.score.value)[0]
  const worstLevel = worst ? levelOf(latest[worst.id]!.score.value) : 'favoravel'
  const psychosocial = !!latest.psicossocial

  return (
    <>
      <PageHeader title="Devolutiva de Saúde" subtitle="Seus resultados por indicador" right={<UserHeaderRight />} />

      <div className="row between gap-16" style={{ background: 'linear-gradient(90deg, #2a0b4a, #4c1d95)', color: '#fff', borderRadius: 14, padding: '20px 22px' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Obrigado por priorizar sua saúde, {firstName(user?.name ?? 'Camila')}!</div>
          <p style={{ fontSize: 12, color: '#ddd6fe', marginTop: 6, maxWidth: 480, lineHeight: 1.5 }}>
            Cada indicador mostra sua última resposta, numa escala de 1 a 5 em que 5 é a situação mais favorável. Os
            resultados servem para autoconhecimento e não são diagnóstico.
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '10px 16px', textAlign: 'center' }}>
          <div className="xs" style={{ color: '#ddd6fe' }}>Indicadores em atenção</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{attention.length} de {shown.length}</div>
        </div>
      </div>

      {sample && (
        <div className="row gap-8 mt-16 small" style={{ background: 'var(--primary-50)', color: 'var(--primary)', borderRadius: 10, padding: '10px 14px' }}>
          <Info size={15} /> Valores de exemplo: responda o primeiro check-in para ver os seus.
          <button className="link small" style={{ marginLeft: 'auto' }} onClick={() => navigate('/app/checkin')}>Responder agora</button>
        </div>
      )}

      <div className="grid grid-main-side mt-16" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">Reflexão Personalizada</div>
          <p className="small muted mt-12" style={{ lineHeight: 1.65 }}>
            {worst && worstLevel !== 'favoravel'
              ? TIPS[worst.id]
              : 'Seus indicadores estão em faixa favorável. Continue protegendo seus intervalos, seu descanso e o fim do expediente.'}
          </p>
          {worstLevel === 'atencao' && (
            <p className="small muted mt-12" style={{ lineHeight: 1.65 }}>
              Se o desconforto persistir ou estiver afetando sua rotina, procure apoio de um profissional de saúde ou dos
              canais de cuidado oferecidos pela sua empresa.
            </p>
          )}
          {psychosocial && (
            <div className="row gap-8 mt-12 xs" style={{ color: 'var(--primary)', fontWeight: 600, alignItems: 'flex-start' }}>
              <Lightbulb size={14} style={{ flexShrink: 0 }} />
              Suas respostas sobre fatores psicossociais do trabalho não aparecem aqui: elas só compõem os indicadores
              agregados da empresa, sem identificação individual.
            </div>
          )}
          <p className="xs muted mt-16">
            Faixas provisórias: 4 a 5 favorável, 2,5 a 3,9 moderado, abaixo de 2,5 atenção. Itens ainda não validados.
          </p>
        </div>
        <div className="stack gap-8">
          {shown.map((ind) => {
            const l = latest[ind.id]!
            const lv = LEVEL[levelOf(l.score.value)]
            const options = ind.items.map((it, i) => it.options?.find((o) => o.value === l.answers[i])?.label).filter(Boolean)
            return (
              <div key={ind.id} className="card row between" style={{ padding: '12px 14px' }}>
                <div>
                  <div className="small" style={{ color: 'var(--text-2)' }}>{ind.name}</div>
                  <span className={`badge ${lv.badge} mt-8`}>{lv.label ?? ind.favorableLabel}</span>
                  <div className="xs muted mt-8">
                    {options.length ? options.join(' · ') : `Coleta ${ind.periodLabel.toLowerCase()}`}
                    {l.at && ` · ${new Date(l.at).toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: lv.color, whiteSpace: 'nowrap', marginLeft: 12 }}>{l.score.value.toFixed(1)} / 5</div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
