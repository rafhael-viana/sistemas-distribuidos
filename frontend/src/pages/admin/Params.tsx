import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Toggle } from '../../components/Toggle'

const PARAMS_KEY = 'mindsync.params'
const DEFAULTS = { retention: '12', minGroup: 5, dailyEmails: true, push: false }

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PARAMS_KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

export function Params() {
  const [saved, setSaved] = useState(load)
  const [form, setForm] = useState(saved)
  const [msg, setMsg] = useState('')
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)

  function save() {
    localStorage.setItem(PARAMS_KEY, JSON.stringify(form))
    setSaved(form)
    setMsg('Parâmetros salvos com sucesso.')
  }

  return (
    <>
      <PageHeader
        title="Parâmetros Institucionais"
        subtitle="Defina as regras de proteção de dados, limiares de exibição e notificações corporativas."
        right={<span className="pill">Configurações da Conta</span>}
      />
      <div className="card">
        <div className="card-title">1. Política de Retenção de Dados</div>
        <p className="xs muted mt-8">Especifique o tempo de guarda do histórico de check-ins individuais antes de serem anonimizados definitivamente.</p>
        <select className="select mt-12" style={{ width: 'auto', fontSize: 12 }} value={form.retention} onChange={(e) => setForm({ ...form, retention: e.target.value })}>
          <option value="6">6 Meses</option>
          <option value="12">12 Meses (Recomendado para relatórios anuais)</option>
          <option value="24">24 Meses</option>
        </select>
        <hr className="divider" />

        <div className="card-title">2. Limiar Mínimo de Agregação</div>
        <p className="xs muted mt-8">Número mínimo de colaboradores ativos por equipe para exibição de métricas agregadas na visão gerencial, garantindo privacidade.</p>
        <div className="row gap-8 mt-12">
          <input className="input" type="number" min={3} max={50} style={{ width: 80, fontSize: 12 }} value={form.minGroup} onChange={(e) => setForm({ ...form, minGroup: Number(e.target.value) })} />
          <span className="small" style={{ fontWeight: 600 }}>participantes</span>
        </div>
        <hr className="divider" />

        <div className="card-title">3. Preferências de Comunicação &amp; Notificações</div>
        <p className="xs muted mt-8">Habilite ou desabilite o envio automático de lembretes e relatórios no sistema.</p>
        <div className="row between mt-12">
          <div>
            <div className="small" style={{ fontWeight: 600 }}>E-mails diários de lembrete</div>
            <div className="xs muted">Envia uma notificação por e-mail quando o check-in diário estiver pronto para resposta.</div>
          </div>
          <Toggle checked={form.dailyEmails} onChange={(v) => setForm({ ...form, dailyEmails: v })} label="E-mails diários" />
        </div>
        <div className="row between mt-12">
          <div>
            <div className="small" style={{ fontWeight: 600 }}>Notificações Push na Plataforma</div>
            <div className="xs muted">Exibe balões flutuantes de alerta diretamente no painel pessoal do usuário.</div>
          </div>
          <Toggle checked={form.push} onChange={(v) => setForm({ ...form, push: v })} label="Notificações push" />
        </div>
        <hr className="divider" />
        <div className="row between">
          <span>{msg && !dirty && <span className="small" style={{ color: 'var(--green-700)' }}>{msg}</span>}</span>
          <div className="row gap-8">
            <button className="btn btn-outline btn-square" disabled={!dirty} onClick={() => setForm(saved)}>Descartar</button>
            <button className="btn btn-primary btn-square" disabled={!dirty} onClick={save}>Salvar Alterações</button>
          </div>
        </div>
      </div>
    </>
  )
}
