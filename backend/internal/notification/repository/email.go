package repository

import (
	"context"
	"errors"
	"sort"
	"sync"

	"github.com/rafhael-viana/TCC/internal/notification/model"
)

var ErrEmailNotFound = errors.New("email not found")

type EmailRepository interface {
	Save(ctx context.Context, e *model.Email) error
	FindByID(ctx context.Context, id string) (*model.Email, error)
	List(ctx context.Context) ([]*model.Email, error)
}

// MemoryEmailRepository guarda o histórico de emails em memória. Serve até
// existir um banco; basta criar outra implementação de EmailRepository.
type MemoryEmailRepository struct {
	mu     sync.RWMutex
	emails map[string]*model.Email // chave: ID
}

func NewMemoryEmailRepository() *MemoryEmailRepository {
	return &MemoryEmailRepository{emails: make(map[string]*model.Email)}
}

func (r *MemoryEmailRepository) Save(_ context.Context, e *model.Email) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *e
	r.emails[e.ID] = &cp
	return nil
}

func (r *MemoryEmailRepository) FindByID(_ context.Context, id string) (*model.Email, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	e, ok := r.emails[id]
	if !ok {
		return nil, ErrEmailNotFound
	}
	cp := *e
	return &cp, nil
}

// List retorna os emails do mais recente para o mais antigo.
func (r *MemoryEmailRepository) List(_ context.Context) ([]*model.Email, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]*model.Email, 0, len(r.emails))
	for _, e := range r.emails {
		cp := *e
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}
