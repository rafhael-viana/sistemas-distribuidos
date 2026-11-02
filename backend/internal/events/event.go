package events

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"time"
)

// TopicAuth recebe os eventos publicados pelo serviço de autenticação.
const TopicAuth = "auth.events"

const (
	TypeUserRegistered = "user.registered"
	TypeUserUpdated    = "user.updated"
	TypeUserDeleted    = "user.deleted"
	TypeLoginSucceeded = "user.login_succeeded"
	TypeLoginFailed    = "user.login_failed"

	TypeTenantCreated     = "tenant.created"
	TypeTenantUpdated     = "tenant.updated"
	TypeTenantSuspended   = "tenant.suspended"
	TypeTenantReactivated = "tenant.reactivated"
	TypeTenantDeleted     = "tenant.deleted"

	TypeTeamCreated = "team.created"
	TypeTeamUpdated = "team.updated"
	TypeTeamDeleted = "team.deleted"
)

// Event é o envelope comum de todos os eventos de domínio. O conteúdo
// específico de cada tipo vai em Data.
type Event struct {
	ID     string `json:"id"`
	Type   string `json:"type"`
	Source string `json:"source"`
	// CorrelationID é o X-Request-ID da requisição que originou o evento.
	// O publisher preenche a partir do contexto.
	CorrelationID string `json:"correlation_id,omitempty"`
	// TenantID é a empresa a que o evento se refere (vazio = plataforma).
	TenantID   string          `json:"tenant_id,omitempty"`
	OccurredAt time.Time       `json:"occurred_at"`
	Data       json.RawMessage `json:"data"`
}

func New(source, typ string, data any) (Event, error) {
	raw, err := json.Marshal(data)
	if err != nil {
		return Event{}, fmt.Errorf("marshal %s data: %w", typ, err)
	}
	return Event{
		ID:         rand.Text(),
		Type:       typ,
		Source:     source,
		OccurredAt: time.Now().UTC(),
		Data:       raw,
	}, nil
}

type UserRegistered struct {
	UserID   string `json:"user_id"`
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role,omitempty"`
	TenantID string `json:"tenant_id,omitempty"`
	TeamID   string `json:"team_id,omitempty"`
	ActorID  string `json:"actor_id,omitempty"` // quem criou; vazio = autocadastro
}

// UserUpdated leva o estado completo do usuário depois da alteração.
type UserUpdated struct {
	UserID   string `json:"user_id"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	TenantID string `json:"tenant_id,omitempty"`
	TeamID   string `json:"team_id,omitempty"`
	Active   bool   `json:"active"`
	ActorID  string `json:"actor_id,omitempty"`
}

type UserDeleted struct {
	UserID  string `json:"user_id"`
	ActorID string `json:"actor_id,omitempty"`
}

// TenantChanged é o dado dos eventos tenant.*: o estado da empresa depois da operação.
type TenantChanged struct {
	TenantID string `json:"tenant_id"`
	Name     string `json:"name"`
	Plan     string `json:"plan"`
	Status   string `json:"status"`
	MaxUsers int    `json:"max_users"`
	ActorID  string `json:"actor_id,omitempty"`
}

// TeamChanged é o dado dos eventos team.*.
type TeamChanged struct {
	TeamID   string `json:"team_id"`
	TenantID string `json:"tenant_id"`
	Name     string `json:"name"`
	ActorID  string `json:"actor_id,omitempty"`
}

type LoginSucceeded struct {
	UserID string `json:"user_id"`
}

type LoginFailed struct {
	Login  string `json:"login"` // email ou username informado
	Reason string `json:"reason"`
}

// TopicReport recebe os pedidos de geração de relatório. Qualquer serviço
// pode publicar nele; o gerador de relatórios consome.
const TopicReport = "report.events"

const TypeReportRequested = "report.requested"

type ReportRequested struct {
	ReportID    string   `json:"report_id"`
	Type        string   `json:"type"`   // users, logins
	Format      string   `json:"format"` // pdf, csv
	TenantID    string   `json:"tenant_id,omitempty"`
	TeamIDs     []string `json:"team_ids,omitempty"`
	RequestedBy string   `json:"requested_by,omitempty"`
}

// TopicLogs recebe os logs técnicos de todos os serviços (requisições HTTP,
// processamento de eventos e erros). O serviço de auditoria consome e guarda.
const TopicLogs = "logs.events"

const TypeLogRecorded = "log.recorded"

// Níveis de log técnico.
const (
	LevelInfo     = "info"
	LevelWarn     = "warn"
	LevelError    = "error"
	LevelCritical = "critical"
)

// LogRecord é um registro de log técnico. Kind diz a origem: "http" (uma
// requisição atendida) ou "event" (um evento do Kafka processado).
type LogRecord struct {
	Service    string `json:"service"`
	Level      string `json:"level"`
	Kind       string `json:"kind"`
	Message    string `json:"message"`
	Method     string `json:"method,omitempty"`
	Path       string `json:"path,omitempty"`
	Status     int    `json:"status,omitempty"`
	DurationMS int64  `json:"duration_ms"`
	UserID     string `json:"user_id,omitempty"`
	Error      string `json:"error,omitempty"`
	Stack      string `json:"stack,omitempty"`
}
