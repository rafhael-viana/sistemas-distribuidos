package repository

import (
	"context"
	"sort"
	"sync"

	"github.com/rafhael-viana/TCC/internal/audit/model"
)

type Filter struct {
	Type string // vazio = todos
}

type EntryRepository interface {
	Save(ctx context.Context, e *model.Entry) error
	List(ctx context.Context, f Filter) ([]*model.Entry, error)
}

// MemoryEntryRepository guarda a trilha de auditoria em memória. Serve até
// existir um banco; basta criar outra implementação de EntryRepository.
type MemoryEntryRepository struct {
	mu      sync.RWMutex
	entries map[string]*model.Entry // chave: EventID
}

func NewMemoryEntryRepository() *MemoryEntryRepository {
	return &MemoryEntryRepository{entries: make(map[string]*model.Entry)}
}

// Save é idempotente: um evento entregue de novo pelo Kafka não é duplicado.
func (r *MemoryEntryRepository) Save(_ context.Context, e *model.Entry) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.entries[e.EventID]; ok {
		return nil
	}
	cp := *e
	r.entries[e.EventID] = &cp
	return nil
}

// List retorna os registros do evento mais recente para o mais antigo.
func (r *MemoryEntryRepository) List(_ context.Context, f Filter) ([]*model.Entry, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]*model.Entry, 0, len(r.entries))
	for _, e := range r.entries {
		if f.Type != "" && e.Type != f.Type {
			continue
		}
		cp := *e
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].OccurredAt.After(out[j].OccurredAt) })
	return out, nil
}
