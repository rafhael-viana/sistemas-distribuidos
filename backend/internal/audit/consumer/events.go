package consumer

import (
	"context"
	"time"

	"github.com/rafhael-viana/TCC/internal/audit/model"
	"github.com/rafhael-viana/TCC/internal/audit/repository"
	"github.com/rafhael-viana/TCC/internal/events"
)

// Recorder grava todo evento recebido na trilha de auditoria.
type Recorder struct {
	entries repository.EntryRepository
}

func NewRecorder(entries repository.EntryRepository) *Recorder {
	return &Recorder{entries: entries}
}

func (c *Recorder) Handle(ctx context.Context, e events.Event) error {
	return c.entries.Save(ctx, &model.Entry{
		EventID:    e.ID,
		Type:       e.Type,
		Source:     e.Source,
		OccurredAt: e.OccurredAt,
		Data:       e.Data,
		RecordedAt: time.Now().UTC(),
	})
}
