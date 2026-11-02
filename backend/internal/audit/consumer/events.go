package consumer

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/rafhael-viana/TCC/internal/audit/model"
	"github.com/rafhael-viana/TCC/internal/audit/repository"
	"github.com/rafhael-viana/TCC/internal/events"
)

// Recorder grava todo evento de domínio recebido na trilha de auditoria.
type Recorder struct {
	entries repository.EntryRepository
}

func NewRecorder(entries repository.EntryRepository) *Recorder {
	return &Recorder{entries: entries}
}

func (c *Recorder) Handle(ctx context.Context, e events.Event) error {
	return c.entries.Save(ctx, &model.Entry{
		EventID:       e.ID,
		Type:          e.Type,
		Source:        e.Source,
		TenantID:      e.TenantID,
		CorrelationID: e.CorrelationID,
		OccurredAt:    e.OccurredAt,
		Data:          e.Data,
		RecordedAt:    time.Now().UTC(),
	})
}

// LogRecorder guarda os logs técnicos publicados pelos serviços.
type LogRecorder struct {
	logs repository.LogRepository
}

func NewLogRecorder(logs repository.LogRepository) *LogRecorder {
	return &LogRecorder{logs: logs}
}

func (c *LogRecorder) Handle(ctx context.Context, e events.Event) error {
	if e.Type != events.TypeLogRecorded {
		return nil
	}
	var rec events.LogRecord
	if err := json.Unmarshal(e.Data, &rec); err != nil {
		log.Printf("discarding log %s: %v", e.ID, err)
		return nil
	}
	return c.logs.Save(ctx, &model.LogEntry{
		ID:         e.ID,
		RequestID:  e.CorrelationID,
		Service:    rec.Service,
		Level:      rec.Level,
		Kind:       rec.Kind,
		Message:    rec.Message,
		Method:     rec.Method,
		Path:       rec.Path,
		Status:     rec.Status,
		DurationMS: rec.DurationMS,
		UserID:     rec.UserID,
		Error:      rec.Error,
		Stack:      rec.Stack,
		OccurredAt: e.OccurredAt,
	})
}
