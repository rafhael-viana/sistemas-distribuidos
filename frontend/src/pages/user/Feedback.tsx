import { Lightbulb } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { UserHeaderRight } from '../../components/UserHeaderRight'
import { firstName, useAuth } from '../../context/AuthContext'
import { loadResult, SAMPLE_RESULT } from '../../data/checkin'

type Level = { label: string; badge: string; color: string }

// Notas >= 4 são saudáveis, entre 2.5 e 4 moderadas e abaixo disso pedem atenção.
function level(value: number, goodLabel: string): Level {
  if (value >= 4) return { label: goodLabel, badge: 'badge-green', color: 'var(--green)' }
  if (value >= 2.5) return { label: 'Moderada', badge: 'badge-orange', color: 'var(--orange)' }
  return { label: 'Atenção', badge: 'badge-red', color: 'var(--red)' }
}

export function Feedback() {
  const { user } = useAuth()
  const r = loadResult() ?? SAMPLE_RESULT

  const metrics = [
    { label: 'Carga de Trabalho', value: r.workload, lv: level(r.workload, 'Adequada') },
    { label: 'Bem-estar Geral', value: r.wellbeing, lv: level(r.wellbeing, 'Excelente') },
    { label: 'Fadiga Cognitiva', value: r.fatigue, lv: level(r.fatigue, 'Baixa') },
    { label: 'Technostress', value: r.technostress, lv: level(r.technostress, 'Baixo') },
  ]

  const heavy = r.workload < 4
  return (
    <>
      <PageHeader title="Devolutiva de Saúde" subtitle="Seus resultados e insights do último check-in" right={<UserHeaderRight />} />

      <div className="row between gap-16" style={{ background: 'linear-gradient(90deg, #2a0b4a, #4c1d95)', color: '#fff', borderRadius: 14, padding: '20px 22px' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Obrigado por priorizar sua saúde hoje, {firstName(user?.name ?? 'Camila')}!</div>
          <p style={{ fontSize: 12, color: '#ddd6fe', marginTop: 6, maxWidth: 480, lineHeight: 1.5 }}>
            Lembre-se: o autocuidado não é um luxo, mas sim a base para uma jornada profissional próspera e equilibrada. Veja abaixo sua análise atual.
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '10px 16px', textAlign: 'center' }}>
          <div className="xs" style={{ color: '#ddd6fe' }}>Score Geral</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{r.overall.toFixed(1)} / 10</div>
        </div>
      </div>

      <div className="grid grid-main-side mt-16" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">Reflexão Personalizada</div>
          <p className="small muted mt-12" style={{ lineHeight: 1.65 }}>
            {heavy
              ? 'Você indicou que sua carga de trabalho tem se mantido elevada ultimamente. Esse é um lembrete gentil para acolher seus limites: nenhum prazo é mais importante do que sua integridade física e mental.'
              : 'Sua carga de trabalho parece equilibrada nesta semana. Continue protegendo seus intervalos e respeitando o fim do expediente.'}
          </p>
          <p className="small muted mt-12" style={{ lineHeight: 1.65 }}>
            Experimente fazer pequenas pausas programadas de 5 minutos a cada hora para respirar profundamente e reavaliar suas prioridades sem pressões externas.
          </p>
          <div className="row gap-8 mt-12 xs" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            <Lightbulb size={14} />
            Dica: Experimente utilizar nossa ferramenta de Pomodoro integrada para ajudar nos intervalos.
          </div>
        </div>
        <div className="stack gap-8">
          {metrics.map((m) => (
            <div key={m.label} className="card row between" style={{ padding: '12px 14px' }}>
              <div>
                <div className="small" style={{ color: 'var(--text-2)' }}>{m.label}</div>
                <span className={`badge ${m.lv.badge} mt-8`}>{m.lv.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.lv.color }}>{m.value.toFixed(1)} / 5</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
