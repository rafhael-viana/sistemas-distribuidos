package repository

import (
	"context"
	"errors"
	"sort"
	"sync"

	"github.com/rafhael-viana/TCC/internal/report/model"
)

var ErrReportNotFound = errors.New("report not found")

type ReportRepository interface {
	Save(ctx context.Context, r *model.Report) error
	FindByID(ctx context.Context, id string) (*model.Report, error)
	List(ctx context.Context) ([]*model.Report, error)
}

// MemoryReportRepository guarda os pedidos de relatório em memória. Serve até
// existir um banco; basta criar outra implementação de ReportRepository.
type MemoryReportRepository struct {
	mu      sync.RWMutex
	reports map[string]*model.Report // chave: ID
}

func NewMemoryReportRepository() *MemoryReportRepository {
	return &MemoryReportRepository{reports: make(map[string]*model.Report)}
}

func (r *MemoryReportRepository) Save(_ context.Context, rep *model.Report) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *rep
	r.reports[rep.ID] = &cp
	return nil
}

func (r *MemoryReportRepository) FindByID(_ context.Context, id string) (*model.Report, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	rep, ok := r.reports[id]
	if !ok {
		return nil, ErrReportNotFound
	}
	cp := *rep
	return &cp, nil
}

// List retorna os relatórios do mais recente para o mais antigo.
func (r *MemoryReportRepository) List(_ context.Context) ([]*model.Report, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]*model.Report, 0, len(r.reports))
	for _, rep := range r.reports {
		cp := *rep
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}
