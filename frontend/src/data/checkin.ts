// Check-in organizado pela Matriz de Indicadores do TCC (Quadro 2): seis
// indicadores, cada um com a própria periodicidade, fonte e uso na plataforma.
//
// Os itens abaixo são PROVISÓRIOS, escritos pela equipe para o protótipo.
// O Quadro 2 prevê "questionário de autorrelato ou escala validada" com
// "pontuação conforme o instrumento selecionado": quando o grupo escolher os
// instrumentos validados, troque `items` (e `instrument`) de cada indicador
// pelo texto e pela regra de pontuação publicados, citando a fonte.

export type IndicatorId = 'estresse' | 'bemEstar' | 'equilibrio' | 'psicossocial' | 'recuperacao' | 'sedentarismo'

export interface Option {
  label: string
  // Pontuação de 1 a 5, em que maior = mais favorável.
  value: number
}

export interface Item {
  text: string
  // Concordar indica algo desfavorável (ex.: "senti-me tenso"): a nota é invertida.
  reversed?: boolean
  // Dimensão do item (fatores psicossociais são pontuados por dimensão).
  dimension?: string
  // Sem opções, o item usa a escala de concordância de 1 a 5.
  options?: Option[]
}

export interface Indicator {
  id: IndicatorId
  name: string
  // Colunas do Quadro 2.
  evidence: string
  source: string
  periodLabel: 'Semanal' | 'Quinzenal' | 'Mensal'
  periodDays: number
  calculation: string
  interpretation: string
  use: string
  // individual: aparece na devolutiva e no histórico do profissional;
  // agregado: só entra nos indicadores da organização (Quadro 2, item 4).
  scope: 'individual' | 'agregado'
  recall: string
  favorableLabel: string
  instrument: string
  items: Item[]
}

const PROVISIONAL = 'Itens provisórios da equipe MIND SYNC (não validados)'

export const AGREEMENT = ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente']

export const INDICATORS: Indicator[] = [
  {
    id: 'estresse',
    name: 'Estresse ocupacional',
    evidence: 'Eklund et al. (2021); Van der Feltz-Cornelis et al. (2023); Indra et al. (2024)',
    source: 'Questionário de autorrelato ou escala validada',
    periodLabel: 'Semanal',
    periodDays: 7,
    calculation: 'Pontuação conforme o instrumento selecionado',
    interpretation: 'Acompanhamento da intensidade percebida do estresse',
    use: 'Dashboard individual e tendências agregadas',
    scope: 'individual',
    recall: 'Pense nos últimos 7 dias de trabalho.',
    favorableLabel: 'Baixo',
    instrument: PROVISIONAL,
    items: [
      { text: 'Senti-me tenso(a) ou sob pressão por causa do trabalho.', reversed: true },
      { text: 'Senti que as demandas do trabalho estavam além da minha capacidade de lidar com elas.', reversed: true },
      { text: 'Tive dificuldade de manter a calma diante de problemas no trabalho.', reversed: true },
    ],
  },
  {
    id: 'bemEstar',
    name: 'Bem-estar psicológico',
    evidence: 'Floridou, Katre e Jeuken (2025); Peláez Zuberbuhler et al. (2025)',
    source: 'Instrumento multidimensional de bem-estar',
    periodLabel: 'Quinzenal',
    periodDays: 14,
    calculation: 'Pontuação conforme o instrumento selecionado',
    interpretation: 'Acompanhamento das condições percebidas de bem-estar',
    use: 'Histórico individual e indicadores organizacionais agregados',
    scope: 'individual',
    recall: 'Pense nas últimas 2 semanas, no trabalho e na vida pessoal.',
    favorableLabel: 'Bom',
    instrument: PROVISIONAL,
    items: [
      { text: 'Senti-me disposto(a) e com energia.', dimension: 'Saúde física' },
      { text: 'Senti-me emocionalmente bem na maior parte do tempo.', dimension: 'Saúde mental' },
      { text: 'Senti que meu trabalho tem sentido e me motiva.', dimension: 'Prosperar no trabalho' },
      { text: 'Senti-me conectado(a) às pessoas, no trabalho e fora dele.', dimension: 'Conexão' },
    ],
  },
  {
    id: 'equilibrio',
    name: 'Equilíbrio entre vida pessoal e profissional',
    evidence: 'Althammer, Wöhrmann e Michel (2023)',
    source: 'Questionário de percepção sobre conciliação trabalho–vida',
    periodLabel: 'Mensal',
    periodDays: 30,
    calculation: 'Pontuação ou distribuição das respostas',
    interpretation: 'Identificação de dificuldades percebidas na conciliação',
    use: 'Dashboard individual e análise organizacional',
    scope: 'individual',
    recall: 'Pense no último mês.',
    favorableLabel: 'Adequado',
    instrument: PROVISIONAL,
    items: [
      { text: 'Consegui dedicar tempo suficiente à família, aos amigos e aos meus interesses pessoais.' },
      { text: 'O trabalho invadiu meus horários de descanso ou de lazer.', reversed: true },
      { text: 'Consigo conciliar as demandas do trabalho com as da vida pessoal.' },
    ],
  },
  {
    id: 'psicossocial',
    name: 'Fatores psicossociais do trabalho',
    evidence: 'Van der Feltz-Cornelis et al. (2023)',
    source: 'Questionário de avaliação das condições psicossociais',
    periodLabel: 'Mensal',
    periodDays: 30,
    calculation: 'Pontuações por dimensão, conforme instrumento adotado',
    interpretation: 'Identificação de condições laborais percebidas como desfavoráveis',
    use: 'Dashboard organizacional com dados agregados',
    scope: 'agregado',
    recall: 'Pense no último mês. Estas respostas só aparecem para a empresa de forma agregada.',
    favorableLabel: 'Favoráveis',
    instrument: PROVISIONAL,
    items: [
      { text: 'O volume de demandas é compatível com o tempo que tenho para realizá-las.', dimension: 'Demandas' },
      { text: 'Tenho autonomia para decidir como organizar o meu trabalho.', dimension: 'Autonomia' },
      { text: 'Recebo apoio da liderança e dos colegas quando preciso.', dimension: 'Apoio social' },
      { text: 'Meu trabalho é reconhecido.', dimension: 'Reconhecimento' },
    ],
  },
  {
    id: 'recuperacao',
    name: 'Recuperação e desligamento psicológico do trabalho',
    evidence: 'Althammer, Wöhrmann e Michel (2023)',
    source: 'Questionário de autorrelato',
    periodLabel: 'Quinzenal',
    periodDays: 14,
    calculation: 'Pontuação conforme instrumento selecionado',
    interpretation: 'Acompanhamento da capacidade percebida de recuperação',
    use: 'Histórico individual e tendências agregadas',
    scope: 'individual',
    recall: 'Pense nas últimas 2 semanas.',
    favorableLabel: 'Adequada',
    instrument: PROVISIONAL,
    items: [
      { text: 'Consegui me desligar do trabalho ao fim do expediente.' },
      { text: 'Nos momentos de folga, continuei pensando em questões do trabalho.', reversed: true },
      { text: 'Comecei a jornada me sentindo descansado(a).' },
    ],
  },
  {
    id: 'sedentarismo',
    name: 'Comportamento sedentário',
    evidence: 'Bort-Roig et al. (2025); Parés-Salomón et al. (2024)',
    source: 'Autorrelato de tempo sentado e pausas durante o trabalho',
    periodLabel: 'Semanal',
    periodDays: 7,
    calculation: 'Tempo sentado informado e frequência de pausas',
    interpretation: 'Acompanhamento dos hábitos sedentários no trabalho',
    use: 'Indicadores individuais e informações educativas',
    scope: 'individual',
    recall: 'Pense em um dia de trabalho típico dos últimos 7 dias.',
    favorableLabel: 'Adequado',
    instrument: 'Autorrelato de tempo sentado e de pausas (faixas provisórias)',
    items: [
      {
        text: 'Quanto tempo você ficou sentado(a) durante o expediente?',
        dimension: 'Tempo sentado',
        options: [
          { label: 'Menos de 4 h', value: 5 },
          { label: '4 a 6 h', value: 4 },
          { label: '6 a 8 h', value: 3 },
          { label: '8 a 10 h', value: 2 },
          { label: 'Mais de 10 h', value: 1 },
        ],
      },
      {
        text: 'Com que frequência você se levantou para fazer pausas e se movimentar?',
        dimension: 'Pausas',
        options: [
          { label: 'A cada 30 min', value: 5 },
          { label: 'A cada 1 h', value: 4 },
          { label: 'A cada 2 h', value: 3 },
          { label: 'Poucas vezes no dia', value: 2 },
          { label: 'Quase nunca', value: 1 },
        ],
      },
    ],
  },
]

export const indicator = (id: IndicatorId) => INDICATORS.find((i) => i.id === id)!

// ---- pontuação ----

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

// Respostas brutas: valor escolhido (1 a 5) de cada item, na ordem de `items`.
export type RawAnswers = Partial<Record<IndicatorId, number[]>>

export interface Score {
  // Média de 1 a 5 em que maior = mais favorável (estresse 4,5 = pouco estresse).
  value: number
  // Média por dimensão, quando os itens têm dimensão.
  dimensions?: Record<string, number>
}

export function itemScore(item: Item, answer: number): number {
  return item.reversed ? 6 - answer : answer
}

export function scoreIndicator(ind: Indicator, answers: number[]): Score {
  const scores = ind.items.map((it, i) => itemScore(it, answers[i]!))
  const dims: Record<string, number[]> = {}
  ind.items.forEach((it, i) => {
    if (it.dimension) (dims[it.dimension] ??= []).push(scores[i]!)
  })
  const dimensions = Object.keys(dims).length
    ? Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, avg(v)]))
    : undefined
  return { value: avg(scores), dimensions }
}

export type LevelKind = 'favoravel' | 'moderado' | 'atencao'

// Faixas provisórias, até a adoção dos pontos de corte do instrumento validado.
export function levelOf(value: number): LevelKind {
  if (value >= 4) return 'favoravel'
  if (value >= 2.5) return 'moderado'
  return 'atencao'
}

// ---- histórico (protótipo: guardado só no navegador) ----

export interface CheckinEntry {
  at: string
  answers: RawAnswers
  scores: Partial<Record<IndicatorId, Score>>
}

const HISTORY_KEY = 'mindsync.checkins'

export function loadHistory(): CheckinEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const list = raw ? (JSON.parse(raw) as CheckinEntry[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveCheckin(answers: RawAnswers): CheckinEntry {
  const scores: CheckinEntry['scores'] = {}
  for (const [id, a] of Object.entries(answers) as [IndicatorId, number[]][]) {
    scores[id] = scoreIndicator(indicator(id), a)
  }
  const entry: CheckinEntry = { at: new Date().toISOString(), answers, scores }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([...loadHistory(), entry]))
    localStorage.removeItem('mindsync.lastCheckin') // formato antigo (4 dimensões)
  } catch {
    // sem armazenamento: a devolutiva desta sessão ainda funciona
  }
  return entry
}

export interface Latest {
  at: string
  score: Score
  answers: number[]
}

// Última resposta de cada indicador.
export function latestByIndicator(history: CheckinEntry[]): Partial<Record<IndicatorId, Latest>> {
  const out: Partial<Record<IndicatorId, Latest>> = {}
  for (const e of history) {
    for (const id of Object.keys(e.scores) as IndicatorId[]) {
      out[id] = { at: e.at, score: e.scores[id]!, answers: e.answers[id] ?? [] }
    }
  }
  return out
}

const DAY = 24 * 60 * 60 * 1000

// Indicadores que vencem hoje, pela periodicidade do Quadro 2.
export function dueIndicators(history: CheckinEntry[], now = new Date()): Indicator[] {
  const latest = latestByIndicator(history)
  return INDICATORS.filter((ind) => {
    const l = latest[ind.id]
    return !l || now.getTime() - new Date(l.at).getTime() >= ind.periodDays * DAY
  })
}

// Data em que cada indicador volta a ser perguntado.
export function nextDue(history: CheckinEntry[]): { indicator: Indicator; date: Date }[] {
  const latest = latestByIndicator(history)
  return INDICATORS.map((ind) => {
    const l = latest[ind.id]
    return { indicator: ind, date: l ? new Date(new Date(l.at).getTime() + ind.periodDays * DAY) : new Date() }
  }).sort((a, b) => a.date.getTime() - b.date.getTime())
}

// Valores de exemplo do protótipo, mostrados até o primeiro check-in.
export const SAMPLE_LATEST: Partial<Record<IndicatorId, Latest>> = {
  estresse: { at: '', score: { value: 3.0 }, answers: [3, 3, 3] },
  bemEstar: { at: '', score: { value: 3.8 }, answers: [4, 4, 3, 4] },
  equilibrio: { at: '', score: { value: 3.3 }, answers: [4, 3, 3] },
  psicossocial: { at: '', score: { value: 3.5 }, answers: [3, 4, 4, 3] },
  recuperacao: { at: '', score: { value: 2.7 }, answers: [3, 4, 3] },
  sedentarismo: { at: '', score: { value: 2.5 }, answers: [2, 3] },
}
