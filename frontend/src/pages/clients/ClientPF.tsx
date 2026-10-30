import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClientTabs, ClientTitle } from './ClientsLayout'
import { addClients, maskCEP, maskCPF, maskDate, maskPhone, validCPF } from '../../data/clients'

const EMPTY = { name: '', cpf: '', phone: '', birth: '', cep: '', city: '', state: '', street: '', number: '', district: '' }

export function ClientPF() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const set = (k: keyof typeof EMPTY, mask?: (v: string) => string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: mask ? mask(e.target.value) : e.target.value })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!validCPF(form.cpf)) {
      setError('CPF inválido: confira os dígitos verificadores.')
      return
    }
    addClients([{ name: form.name, document: form.cpf, phone: form.phone, type: 'PF', active: true }])
    navigate('/clientes', { state: { created: form.name } })
  }

  return (
    <>
      <ClientTitle>Cadastro Pessoa Física</ClientTitle>
      <ClientTabs />
      <form className="card" style={{ padding: 22 }} onSubmit={submit}>
        <div className="form-section">Dados Pessoais</div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 180px' }}>
          <Field label="Nome Completo"><input className="input" placeholder="Ex: Carlos Eduardo de Souza" value={form.name} onChange={set('name')} required /></Field>
          <Field label="CPF"><input className="input" placeholder="000.000.000-00" value={form.cpf} onChange={set('cpf', maskCPF)} required /></Field>
        </div>
        <div className="grid grid-2 mt-12">
          <Field label="Telefone"><input className="input" placeholder="(11) 99999-9999" value={form.phone} onChange={set('phone', maskPhone)} required /></Field>
          <Field label="Data de Nascimento"><input className="input" placeholder="DD/MM/AAAA" value={form.birth} onChange={set('birth', maskDate)} required /></Field>
        </div>

        <div className="form-section mt-24">Endereço Residencial</div>
        <div className="grid" style={{ gridTemplateColumns: '130px 1fr 66px' }}>
          <Field label="CEP"><input className="input" placeholder="00000-000" value={form.cep} onChange={set('cep', maskCEP)} required /></Field>
          <Field label="Cidade"><input className="input" placeholder="Ex: São Paulo" value={form.city} onChange={set('city')} required /></Field>
          <Field label="Estado"><input className="input" placeholder="SP" maxLength={2} value={form.state} onChange={set('state', (v) => v.toUpperCase())} required /></Field>
        </div>
        <div className="grid mt-12" style={{ gridTemplateColumns: '1fr 90px' }}>
          <Field label="Rua"><input className="input" placeholder="Ex: Avenida Paulista" value={form.street} onChange={set('street')} required /></Field>
          <Field label="Número"><input className="input" placeholder="1234" value={form.number} onChange={set('number')} required /></Field>
        </div>
        <div className="mt-12">
          <Field label="Bairro"><input className="input" placeholder="Ex: Bela Vista" value={form.district} onChange={set('district')} required /></Field>
        </div>
        {error && <div className="error-msg mt-16">{error}</div>}
        <hr className="divider" />
        <div className="row gap-12" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline-primary btn-square" onClick={() => setForm(EMPTY)}>Cancelar</button>
          <button className="btn btn-primary btn-square">Cadastrar</button>
        </div>
      </form>
    </>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
