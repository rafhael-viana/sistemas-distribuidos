package repository

import (
	"context"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/rafhael-viana/TCC/internal/audit/model"
)

// LogFilter restringe a busca de logs técnicos; campos vazios não filtram.
type LogFilter struct {
	Levels  []string
	Service string
	Query   string // mensagem, path, erro, request ID ou usuário
	Since   time.Time
	Limit   int
	Offset  int
}

// LogPage é uma página da busca, com o total e a contagem por nível do filtro
// (sem o filtro de nível, para os contadores do painel).
type LogPage struct {
	Items  []*model.LogEntry `json:"items"`
	Total  int               `json:"total"`
	Counts map[string]int    `json:"counts"`
}

type LogRepository interface {
	Save(ctx context.Context, e *model.LogEntry) error
	List(ctx context.Context, f LogFilter) (*LogPage, error)
	// Trace devolve todos os logs de uma requisição, em ordem cronológica.
	Trace(ctx context.Context, requestID string) ([]*model.LogEntry, error)
}

// maxMemoryLogs limita os logs em memória: os mais antigos são descartados.
const maxMemoryLogs = 5000

type MemoryLogRepository struct {
	mu   sync.RWMutex
	logs []*model.LogEntry // ordem de chegada
	ids  map[string]bool
}

func NewMemoryLogRepository() *MemoryLogRepository {
	return &MemoryLogRepository{ids: make(map[string]bool)}
}

func (r *MemoryLogRepository) Save(_ context.Context, e *model.LogEntry) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.ids[e.ID] {
		return nil
	}
	cp := *e
	r.logs = append(r.logs, &cp)
	r.ids[e.ID] = true
	if len(r.logs) > maxMemoryLogs {
		delete(r.ids, r.logs[0].ID)
		r.logs = r.logs[1:]
	}
	return nil
}

func (f LogFilter) matchBase(e *model.LogEntry) bool {
	if f.Service != "" && e.Service != f.Service {
		return false
	}
	if !f.Since.IsZero() && e.OccurredAt.Before(f.Since) {
		return false
	}
	if q := strings.ToLower(f.Query); q != "" {
		hay := strings.ToLower(strings.Join([]string{e.Message, e.Path, e.Error, e.RequestID, e.UserID}, " "))
		return strings.Contains(hay, q)
	}
	return true
}

func (r *MemoryLogRepository) List(_ context.Context, f LogFilter) (*LogPage, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	page := &LogPage{Items: []*model.LogEntry{}, Counts: map[string]int{}}
	var matched []*model.LogEntry
	for _, e := range r.logs {
		if !f.matchBase(e) {
			continue
		}
		page.Counts[e.Level]++
		if len(f.Levels) == 0 || slices.Contains(f.Levels, e.Level) {
			matched = append(matched, e)
		}
	}
	sort.Slice(matched, func(i, j int) bool { return matched[i].OccurredAt.After(matched[j].OccurredAt) })
	page.Total = len(matched)
	for _, e := range matched[min(f.Offset, len(matched)):min(f.Offset+f.Limit, len(matched))] {
		cp := *e
		page.Items = append(page.Items, &cp)
	}
	return page, nil
}

func (r *MemoryLogRepository) Trace(_ context.Context, requestID string) ([]*model.LogEntry, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := []*model.LogEntry{}
	for _, e := range r.logs {
		if e.RequestID == requestID {
			cp := *e
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].OccurredAt.Before(out[j].OccurredAt) })
	return out, nil
}
