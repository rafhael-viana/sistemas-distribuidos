export interface CheckinStage {
  title: string
  // Quando true, concordar indica algo ruim (ex.: "sinto cansaço") e a nota é invertida.
  inverted?: boolean
  questions: string[]
}

export const CHECKIN_STAGES: CheckinStage[] = [
  {
    title: 'Bem-estar geral',
    questions: [
      'Tenho me sentido disposto(a) e com energia ao longo do dia.',
      'Consigo me desligar do trabalho ao fim do expediente.',
      'Tenho dormido o suficiente para me sentir descansado(a).',
    ],
  },
  {
    title: 'Carga de trabalho',
    questions: [
      'Sinto que o volume de demandas desta semana está adequado para o meu tempo disponível.',
      'Consigo fazer pausas regulares durante o expediente sem me sentir culpado.',
      'O ritmo de trabalho me permite manter um equilíbrio saudável entre vida pessoal e profissional.',
    ],
  },
  {
    title: 'Fadiga cognitiva',
    inverted: true,
    questions: [
      'Sinto dificuldade de concentração depois de algumas horas de trabalho.',
      'Termino o dia com sensação de esgotamento mental.',
      'Percebo cansaço visual ou dores de cabeça por uso de telas.',
    ],
  },
  {
    title: 'Technostress',
    questions: [
      'Me sinto confortável com as ferramentas e sistemas que uso no trabalho.',
      'Notificações e mensagens não interrompem meu foco em excesso.',
      'Não me sinto pressionado(a) a responder mensagens fora do horário.',
    ],
  },
]

export type Answers = number[][]

export function emptyAnswers(): Answers {
  return CHECKIN_STAGES.map((s) => s.questions.map(() => 0))
}

// Todas as dimensões são notas de 1 a 5 em que maior = mais saudável
// (ex.: fadiga 4.5 significa pouca fadiga), como nos cards da devolutiva.
export interface CheckinResult {
  workload: number
  wellbeing: number
  fatigue: number
  technostress: number
  overall: number
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

export function computeResult(a: Answers): CheckinResult {
  const scores = CHECKIN_STAGES.map((stage, i) => (stage.inverted ? 6 - avg(a[i]!) : avg(a[i]!)))
  const [wellbeing, workload, fatigue, technostress] = scores as [number, number, number, number]
  return { wellbeing, workload, fatigue, technostress, overall: (avg(scores) / 5) * 10 }
}

const RESULT_KEY = 'mindsync.lastCheckin'

export function saveResult(r: CheckinResult) {
  localStorage.setItem(RESULT_KEY, JSON.stringify({ ...r, at: new Date().toISOString() }))
}

export function loadResult(): (CheckinResult & { at: string }) | null {
  try {
    const raw = localStorage.getItem(RESULT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Valores de exemplo do protótipo, usados até o primeiro check-in.
export const SAMPLE_RESULT: CheckinResult = { workload: 3.2, wellbeing: 4.8, fatigue: 1.5, technostress: 4.6, overall: 8.2 }
