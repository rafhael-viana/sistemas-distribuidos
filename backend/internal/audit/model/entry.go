package model

import (
	"encoding/json"
	"time"
)

// Entry é um evento registrado na trilha de auditoria.
type Entry struct {
	EventID       string          `json:"event_id"`
	Type          string          `json:"type"`
	Source        string          `json:"source"`
	TenantID      string          `json:"tenant_id,omitempty"`
	CorrelationID string          `json:"correlation_id,omitempty"`
	OccurredAt    time.Time       `json:"occurred_at"`
	Data          json.RawMessage `json:"data"`
	RecordedAt    time.Time       `json:"recorded_at"`
}

// LogEntry é um log técnico recebido de qualquer serviço.
type LogEntry struct {
	ID         string    `json:"id"`
	RequestID  string    `json:"request_id"`
	Service    string    `json:"service"`
	Level      string    `json:"level"`
	Kind       string    `json:"kind"`
	Message    string    `json:"message"`
	Method     string    `json:"method,omitempty"`
	Path       string    `json:"path,omitempty"`
	Status     int       `json:"status,omitempty"`
	DurationMS int64     `json:"duration_ms"`
	UserID     string    `json:"user_id,omitempty"`
	Error      string    `json:"error,omitempty"`
	Stack      string    `json:"stack,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}
