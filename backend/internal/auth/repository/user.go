package repository

import (
	"context"
	"errors"
	"strings"
	"sync"

	"github.com/rafhael-viana/TCC/internal/auth/model"
)

var (
	ErrUserNotFound  = errors.New("user not found")
	ErrEmailTaken    = errors.New("email already in use")
	ErrUsernameTaken = errors.New("username already in use")
)

type UserRepository interface {
	Create(ctx context.Context, u *model.User) error
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindByUsername(ctx context.Context, username string) (*model.User, error)
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

func (r *MemoryUserRepository) FindByEmail(_ context.Context, email string) (*model.User, error) {
	return r.find(func(u *model.User) bool { return strings.EqualFold(u.Email, email) })
}

func (r *MemoryUserRepository) FindByUsername(_ context.Context, username string) (*model.User, error) {
	return r.find(func(u *model.User) bool { return strings.EqualFold(u.Username, username) })
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
