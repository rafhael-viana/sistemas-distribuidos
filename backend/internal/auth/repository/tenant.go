package repository

import (
	"context"
	"errors"
	"slices"
	"sort"
	"strings"
	"sync"

	"github.com/rafhael-viana/TCC/internal/auth/model"
)

var (
	ErrTenantNotFound  = errors.New("tenant not found")
	ErrTenantIDTaken   = errors.New("tenant id already in use")
	ErrInviteCodeTaken = errors.New("invite code already in use")
	ErrTeamNotFound    = errors.New("team not found")
	ErrTeamNameTaken   = errors.New("team name already in use")
)

type TenantRepository interface {
	Create(ctx context.Context, t *model.Tenant) error
	Update(ctx context.Context, t *model.Tenant) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (*model.Tenant, error)
	FindByInviteCode(ctx context.Context, code string) (*model.Tenant, error)
	FindByDomain(ctx context.Context, domain string) (*model.Tenant, error)
	List(ctx context.Context) ([]*model.Tenant, error)
}

type TeamRepository interface {
	Create(ctx context.Context, t *model.Team) error
	Update(ctx context.Context, t *model.Team) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (*model.Team, error)
	FindByName(ctx context.Context, tenantID, name string) (*model.Team, error)
	List(ctx context.Context, tenantID string) ([]*model.Team, error)
}

// MemoryTenantRepository guarda empresas em memória.
type MemoryTenantRepository struct {
	mu      sync.RWMutex
	tenants map[string]*model.Tenant
}

func NewMemoryTenantRepository() *MemoryTenantRepository {
	return &MemoryTenantRepository{tenants: make(map[string]*model.Tenant)}
}

func copyTenant(t *model.Tenant) *model.Tenant {
	cp := *t
	cp.Domains = slices.Clone(t.Domains)
	return &cp
}

func (r *MemoryTenantRepository) checkUnique(t *model.Tenant) error {
	for _, other := range r.tenants {
		if other.ID != t.ID && strings.EqualFold(other.InviteCode, t.InviteCode) {
			return ErrInviteCodeTaken
		}
	}
	return nil
}

func (r *MemoryTenantRepository) Create(_ context.Context, t *model.Tenant) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.tenants[t.ID]; ok {
		return ErrTenantIDTaken
	}
	if err := r.checkUnique(t); err != nil {
		return err
	}
	r.tenants[t.ID] = copyTenant(t)
	return nil
}

func (r *MemoryTenantRepository) Update(_ context.Context, t *model.Tenant) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.tenants[t.ID]; !ok {
		return ErrTenantNotFound
	}
	if err := r.checkUnique(t); err != nil {
		return err
	}
	r.tenants[t.ID] = copyTenant(t)
	return nil
}

func (r *MemoryTenantRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.tenants[id]; !ok {
		return ErrTenantNotFound
	}
	delete(r.tenants, id)
	return nil
}

func (r *MemoryTenantRepository) find(match func(*model.Tenant) bool) (*model.Tenant, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, t := range r.tenants {
		if match(t) {
			return copyTenant(t), nil
		}
	}
	return nil, ErrTenantNotFound
}

func (r *MemoryTenantRepository) FindByID(_ context.Context, id string) (*model.Tenant, error) {
	return r.find(func(t *model.Tenant) bool { return t.ID == id })
}

func (r *MemoryTenantRepository) FindByInviteCode(_ context.Context, code string) (*model.Tenant, error) {
	return r.find(func(t *model.Tenant) bool { return strings.EqualFold(t.InviteCode, code) })
}

func (r *MemoryTenantRepository) FindByDomain(_ context.Context, domain string) (*model.Tenant, error) {
	return r.find(func(t *model.Tenant) bool { return slices.Contains(t.Domains, strings.ToLower(domain)) })
}

func (r *MemoryTenantRepository) List(_ context.Context) ([]*model.Tenant, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]*model.Tenant, 0, len(r.tenants))
	for _, t := range r.tenants {
		out = append(out, copyTenant(t))
	}
	sort.Slice(out, func(i, j int) bool { return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name) })
	return out, nil
}

// MemoryTeamRepository guarda equipes em memória.
type MemoryTeamRepository struct {
	mu    sync.RWMutex
	teams map[string]*model.Team
}

func NewMemoryTeamRepository() *MemoryTeamRepository {
	return &MemoryTeamRepository{teams: make(map[string]*model.Team)}
}

func (r *MemoryTeamRepository) checkName(t *model.Team) error {
	for _, other := range r.teams {
		if other.ID != t.ID && other.TenantID == t.TenantID && strings.EqualFold(other.Name, t.Name) {
			return ErrTeamNameTaken
		}
	}
	return nil
}

func (r *MemoryTeamRepository) Create(_ context.Context, t *model.Team) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if err := r.checkName(t); err != nil {
		return err
	}
	cp := *t
	r.teams[t.ID] = &cp
	return nil
}

func (r *MemoryTeamRepository) Update(_ context.Context, t *model.Team) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.teams[t.ID]; !ok {
		return ErrTeamNotFound
	}
	if err := r.checkName(t); err != nil {
		return err
	}
	cp := *t
	r.teams[t.ID] = &cp
	return nil
}

func (r *MemoryTeamRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.teams[id]; !ok {
		return ErrTeamNotFound
	}
	delete(r.teams, id)
	return nil
}

func (r *MemoryTeamRepository) FindByID(_ context.Context, id string) (*model.Team, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	t, ok := r.teams[id]
	if !ok {
		return nil, ErrTeamNotFound
	}
	cp := *t
	return &cp, nil
}

func (r *MemoryTeamRepository) FindByName(_ context.Context, tenantID, name string) (*model.Team, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, t := range r.teams {
		if t.TenantID == tenantID && strings.EqualFold(t.Name, name) {
			cp := *t
			return &cp, nil
		}
	}
	return nil, ErrTeamNotFound
}

// List retorna as equipes da empresa (todas, com tenantID vazio) por nome.
func (r *MemoryTeamRepository) List(_ context.Context, tenantID string) ([]*model.Team, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := []*model.Team{}
	for _, t := range r.teams {
		if tenantID == "" || t.TenantID == tenantID {
			cp := *t
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name) })
	return out, nil
}
