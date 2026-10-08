package model

import (
	"encoding/json"
	"time"
)

// Entry é um evento registrado na trilha de auditoria.
type Entry struct {
	EventID    string          `json:"event_id"`
	Type       string          `json:"type"`
	Source     string          `json:"source"`
	OccurredAt time.Time       `json:"occurred_at"`
	Data       json.RawMessage `json:"data"`
	RecordedAt time.Time       `json:"recorded_at"`
}
