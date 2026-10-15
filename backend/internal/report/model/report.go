package model

import "time"

type Type string

const (
	TypeUsers  Type = "users"  // usuários cadastrados com resumo de logins
	TypeLogins Type = "logins" // todas as tentativas de login
)

type Format string

const (
	FormatPDF Format = "pdf"
	FormatCSV Format = "csv"
)

type Status string

const (
	StatusPending Status = "pending"
	StatusDone    Status = "done"
	StatusFailed  Status = "failed"
)

// Report é um pedido de relatório. O arquivo gerado fica no armazenamento de
// objetos, na chave ObjectKey.
type Report struct {
	ID          string    `json:"id"`
	Type        Type      `json:"type"`
	Format      Format    `json:"format"`
	Status      Status    `json:"status"`
	Error       string    `json:"error,omitempty"`
	ObjectKey   string    `json:"-"`
	Size        int       `json:"size,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	CompletedAt time.Time `json:"completed_at,omitzero"`
}

// Filename é o nome sugerido para download.
func (r *Report) Filename() string {
	return string(r.Type) + "-" + r.ID + "." + string(r.Format)
}

func (f Format) ContentType() string {
	if f == FormatPDF {
		return "application/pdf"
	}
	return "text/csv; charset=utf-8"
}
