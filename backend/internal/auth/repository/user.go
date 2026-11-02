package repository

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"

	"github.com/rafhael-viana/TCC/internal/auth/model"
)

var (
	ErrUserNotFound  = errors.New("user not found")
	ErrEmailTaken    = errors.New("email already in use")
	ErrUsernameTaken = errors.New("username already in use")
)

// UserFilter restringe a listagem; campos vazios não filtram.
type UserFilter struct {
	TenantID string
	TeamID   string
	Role     model.Role
	Query    string // nome, username ou email
}

func (f UserFilter) match(u *model.User) bool {
	if f.TenantID != "" && u.TenantID != f.TenantID {
		return false
	}
	if f.TeamID != "" && u.TeamID != f.TeamID {
		return false
	}
	if f.Role != "" && u.Role != f.Role {
		return false
	}
	if q := strings.ToLower(f.Query); q != "" {
		return strings.Contains(strings.ToLower(u.Name), q) ||
			strings.Contains(strings.ToLower(u.Username), q) ||
			strings.Contains(strings.ToLower(u.Email), q)
	}
	return true
}

type UserRepository interface {
	Create(ctx context.Context, u *model.User) error
	Update(ctx context.Context, u *model.User) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (*model.User, error)
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindByUsername(ctx context.Context, username string) (*model.User, error)
	List(ctx context.Context, f UserFilter) ([]*model.User, error)
	// ClearTeam tira da equipe todos os membros (usado ao excluir a equipe).
	ClearTeam(ctx context.Context, teamID string) error
}

// MemoryUserRepository guarda usuários em memória.
type MemoryUserRepository struct {
	mu    sync.RWMutex
	users map[string]*model.User // chave: ID
}

func NewMemoryUserRepository() *MemoryUserRepository {
	return &MemoryUserRepository{users: make(map[string]*model.User)}
}

func (r *MemoryUserRepository) Create(_ context.Context, u *model.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, existing := range r.users {
		if strings.EqualFold(existing.Email, u.Email) {
			return ErrEmailTaken
		}
		if strings.EqualFold(existing.Username, u.Username) {
			return ErrUsernameTaken
		}
	}

	cp := *u
	r.users[u.ID] = &cp
	return nil
}

func (r *MemoryUserRepository) Update(_ context.Context, u *model.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.users[u.ID]; !ok {
		return ErrUserNotFound
	}
	cp := *u
	r.users[u.ID] = &cp
	return nil
}

func (r *MemoryUserRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.users[id]; !ok {
		return ErrUserNotFound
	}
	delete(r.users, id)
	return nil
}

func (r *MemoryUserRepository) FindByID(_ context.Context, id string) (*model.User, error) {
	return r.find(func(u *model.User) bool { return u.ID == id })
}

func (r *MemoryUserRepository) FindByEmail(_ context.Context, email string) (*model.User, error) {
	return r.find(func(u *model.User) bool { return strings.EqualFold(u.Email, email) })
}

func (r *MemoryUserRepository) FindByUsername(_ context.Context, username string) (*model.User, error) {
	return r.find(func(u *model.User) bool { return strings.EqualFold(u.Username, username) })
}

// List retorna os usuários em ordem alfabética de nome.
func (r *MemoryUserRepository) List(_ context.Context, f UserFilter) ([]*model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := []*model.User{}
	for _, u := range r.users {
		if f.match(u) {
			cp := *u
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name) })
	return out, nil
}

func (r *MemoryUserRepository) ClearTeam(_ context.Context, teamID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, u := range r.users {
		if u.TeamID == teamID {
			u.TeamID = ""
		}
	}
	return nil
}

func (r *MemoryUserRepository) find(match func(*model.User) bool) (*model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, u := range r.users {
		if match(u) {
			cp := *u
			return &cp, nil
		}
	}
	return nil, ErrUserNotFound
}
