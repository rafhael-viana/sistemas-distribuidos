import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Building2, CheckCircle2, Copy, Download, FileSpreadsheet, UploadCloud } from 'lucide-react'
import { ClientTabs, ClientTitle } from './ClientsLayout'
import { addClients, digits, useClients, validCNPJ } from '../../data/clients'

const TEMPLATE_HEADER = 'razao_social;nome_fantasia;cnpj;data_fundacao;telefone;inscricao_estadual;inscricao_municipal;email;cep;cidade;estado;rua;numero;bairro'

interface Row {
  line: number
  name: string
  cnpj: string
  email: string
  phone: string
  status: 'valid' | 'error' | 'duplicate'
  reason: string
}

// Linhas do protótipo exibidas antes de o operador enviar uma planilha.
const SAMPLE = [
  'Aurora Tecnologia LTDA;Aurora;12.345.678/0001-95;;;;;contato@aurora.example',
  'Horizonte Serviços LTDA;Horizonte;23.456.789/0001-95;;;;;contato@horizonte.example',
  'Vértice Comércio LTDA;Vértice;34.567.890/0001-30;;;;;contato@vertice.example',
  'Prisma Consultoria LTDA;Prisma;45.678.901/0001-00;;;;;contato@prisma.example',
  'Alameda Logística LTDA;Alameda;56.789.012/0001-00;;;;;contato.alameda',
  'Aurora Tecnologia LTDA;Aurora;12.345.678/0001-95;;;;;contato@aurora.example',
]

function validate(lines: string[], existing: Set<string>): Row[] {
  const seen = new Map<string, number>()
  return lines.map((raw, i) => {
    const cols = raw.split(/[;,]/).map((c) => c.trim())
    const line = i + 2 // linha 1 é o cabeçalho
    const [name = '', , cnpj = '', , phone = '', , , email = ''] = cols
    const key = digits(cnpj)
    let status: Row['status'] = 'valid'
    let reason = 'Pronta para cadastro'
    if (!validCNPJ(cnpj)) {
      status = 'error'
      reason = 'CNPJ: dígitos verificadores inválidos'
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      status = 'error'
      reason = 'E-mail: formato inválido'
    } else if (seen.has(key)) {
      status = 'duplicate'
      reason = `CNPJ: repetido na linha ${seen.get(key)}`
    } else if (existing.has(key)) {
      status = 'duplicate'
      reason = 'CNPJ: já cadastrado'
    }
    if (!seen.has(key)) seen.set(key, line)
    return { line, name, cnpj, email, phone, status, reason }
  })
}

export function ClientPJ() {
  const navigate = useNavigate()
  const clients = useClients()
  const existing = new Set(clients.filter((c) => c.type === 'PJ').map((c) => digits(c.document)))
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<{ name: string; size: number } | null>({ name: 'empresas_lote.xlsx', size: 18 * 1024 })
  const [rows, setRows] = useState<Row[]>(() => validate(SAMPLE, new Set()))
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  async function load(f: File) {
    setError('')
    if (!/\.csv$/i.test(f.name)) {
      setError('Envie a planilha em formato CSV (separado por ";" ou ",").')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('O arquivo excede o limite de 10 MB.')
      return
    }
    const lines = (await f.text()).split(/\r?\n/).filter((l) => l.trim())
    setFile({ name: f.name, size: f.size })
    setRows(validate(lines.slice(1), existing))
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_HEADER + '\n'], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'modelo_empresas.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const valid = rows.filter((r) => r.status === 'valid')
  const errors = rows.filter((r) => r.status === 'error').length
  const dups = rows.filter((r) => r.status === 'duplicate').length

  function submit() {
    addClients(valid.map((r) => ({ name: r.name, document: r.cnpj, phone: r.phone || '—', type: 'PJ', active: true })))
    navigate('/clientes', { state: { created: `${valid.length} empresas` } })
  }

  return (
    <>
      <ClientTitle>Cadastro de empresas em massa</ClientTitle>
      <p className="small muted mt-8">Importe uma planilha, revise os dados e cadastre várias pessoas jurídicas de uma só vez.</p>
      <ClientTabs />

      <div className="card">
        <div className="row gap-8"><StepNum n={1} /><b style={{ fontSize: 14 }}>Prepare e envie a planilha</b></div>
        <div className="grid grid-2 mt-12" style={{ gap: 24 }}>
          <div>
            <p className="xs muted" style={{ lineHeight: 1.55 }}>Use o modelo e preencha uma empresa por linha. Mantenha os nomes das colunas e informe o CNPJ completo.</p>
            <p className="xs muted mt-8" style={{ lineHeight: 1.55 }}>
              O modelo inclui razão social, nome fantasia, CNPJ, data de fundação, telefone comercial, inscrições estadual e municipal, e-mail corporativo e endereço comercial (CEP, cidade, estado, rua, número e bairro).
            </p>
            <button className="btn btn-outline btn-sm btn-square mt-12" style={{ color: 'var(--primary)' }} onClick={downloadTemplate}><Download size={13} /> Baixar modelo</button>
          </div>
          <div className="stack gap-8">
            <div
              className="row between"
              style={{ border: `1px dashed ${dragging ? 'var(--primary)' : 'var(--primary-200)'}`, background: 'var(--primary-50)', borderRadius: 10, padding: '12px 14px' }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]) }}
            >
              <div className="row gap-12">
                <UploadCloud size={18} color="var(--primary)" />
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>Arraste sua planilha aqui</div>
                  <div className="xs muted">CSV • até 10 MB</div>
                </div>
              </div>
              <button className="btn btn-outline btn-sm btn-square" style={{ color: 'var(--primary)' }} onClick={() => fileRef.current?.click()}>Selecionar arquivo</button>
            </div>
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
            {file && (
              <div className="row between" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                <div className="row gap-12">
                  <FileSpreadsheet size={16} color="var(--primary)" />
                  <div>
                    <div className="small" style={{ fontWeight: 600 }}>{file.name}</div>
                    <div className="xs muted">{Math.round(file.size / 1024)} KB • {rows.length} registros • aguardando confirmação</div>
                  </div>
                </div>
                <button className="link xs" onClick={() => fileRef.current?.click()}>Substituir</button>
              </div>
            )}
            {error && <div className="error-msg">{error}</div>}
          </div>
        </div>
      </div>

      <div className="card mt-16 table-wrap">
        <div className="row between">
          <div className="row gap-8"><StepNum n={2} /><b style={{ fontSize: 14 }}>Revise os registros</b></div>
          <div className="row gap-8 xs">
            <span className="muted">{rows.length} registros</span>
            <span className="badge badge-green">{valid.length} válidas</span>
            <span className="badge badge-red">{errors} com erro</span>
            <span className="badge badge-orange">{dups} duplicada{dups === 1 ? '' : 's'}</span>
          </div>
        </div>
        <table className="table mt-12">
          <thead><tr><th>Linha</th><th>Razão social</th><th>CNPJ</th><th>E-mail corporativo</th><th>Status de validação</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const bg = r.status === 'error' ? '#fff5f5' : r.status === 'duplicate' ? '#fffbeb' : undefined
              const bad = r.status === 'error'
              return (
                <tr key={r.line}>
                  <td style={{ background: bg }}>{r.line}</td>
                  <td className="strong" style={{ background: bg, fontWeight: 500 }}>{r.name}</td>
                  <td style={{ background: bg, color: bad && r.reason.startsWith('CNPJ') ? 'var(--red)' : undefined }}>{r.cnpj}</td>
                  <td style={{ background: bg, color: bad && r.reason.startsWith('E-mail') ? 'var(--red)' : undefined }}>{r.email}</td>
                  <td style={{ background: bg }}>
                    <div className="row gap-4 xs" style={{ fontWeight: 600, color: r.status === 'valid' ? 'var(--green-700)' : r.status === 'error' ? 'var(--red-700)' : 'var(--orange-700)' }}>
                      {r.status === 'valid' ? <CheckCircle2 size={13} /> : r.status === 'error' ? <AlertCircle size={13} /> : <Copy size={13} />}
                      {r.status === 'valid' ? 'Válida' : r.status === 'error' ? 'Com erro' : 'Duplicada'}
                    </div>
                    <div className="xs" style={{ color: r.status === 'valid' ? 'var(--muted)' : r.status === 'error' ? 'var(--red-700)' : 'var(--orange-700)' }}>{r.reason}</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="row between xs muted mt-12">
          <span>Corrija os campos indicados na planilha e envie o arquivo novamente.</span>
          <span style={{ color: 'var(--muted-2)' }}>Dados demonstrativos • linhas da planilha</span>
        </div>
      </div>

      <div className="row between mt-16 gap-16">
        <div>
          <div className="small" style={{ fontWeight: 700 }}>Somente as {valid.length} empresas válidas serão cadastradas.</div>
          <div className="xs muted mt-8" style={{ maxWidth: 520 }}>
            Os {errors} registros com erro e {dups} duplicado{dups === 1 ? '' : 's'} não serão importados. CNPJs já cadastrados ou repetidos no lote não podem ser cadastrados novamente.
          </div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-outline btn-square" onClick={() => navigate('/clientes')}>Cancelar</button>
          <button className="btn btn-primary btn-square" disabled={valid.length === 0} onClick={submit}>
            <Building2 size={14} /> Cadastrar {valid.length} empresas
          </button>
        </div>
      </div>
    </>
  )
}

function StepNum({ n }: { n: number }) {
  return <span style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--primary-50)', color: 'var(--primary)', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{n}</span>
}
