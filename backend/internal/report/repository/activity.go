package repository

import (
	"context"
	"sort"
	"strings"
	"sync"

	"github.com/rafhael-viana/TCC/internal/report/model"
)

// ActivityRepository guarda os dados que entram nos relatórios, montados a
// partir dos eventos consumidos do Kafka.
type ActivityRepository interface {
	SaveUser(ctx context.Context, u *model.User) error
	// UpdateUser grava nome, perfil, empresa, equipe e status.
	UpdateUser(ctx context.Context, u *model.User) error
	DeleteUser(ctx context.Context, id string) error
	SaveLogin(ctx context.Context, a *model.LoginAttempt) error
	SaveTeam(ctx context.Context, t *model.Team) error
	// DeleteTeam remove a equipe e tira os membros dela.
	DeleteTeam(ctx context.Context, id string) error
	Teams(ctx context.Context) ([]*model.Team, error)
	Users(ctx context.Context, scope model.Scope) ([]*model.User, error)
	Logins(ctx context.Context) ([]*model.LoginAttempt, error)
}

// MemoryActivityRepository guarda os dados em memória. Serve até existir um
// banco; basta criar outra implementação de ActivityRepository.
type MemoryActivityRepository struct {
	mu     sync.RWMutex
	users  map[string]*model.User         // chave: ID
	logins map[string]*model.LoginAttempt // chave: EventID
	teams  map[string]*model.Team         // chave: ID
}

func NewMemoryActivityRepository() *MemoryActivityRepository {
	return &MemoryActivityRepository{
		users:  make(map[string]*model.User),
		logins: make(map[string]*model.LoginAttempt),
		teams:  make(map[string]*model.Team),
	}
}

func (r *MemoryActivityRepository) UpdateUser(_ context.Context, u *model.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.users[u.ID]
	if !ok {
		return nil // atualização de usuário que nunca chegou: ignora
	}
	existing.Name, existing.Role, existing.TenantID = u.Name, u.Role, u.TenantID
	existing.TeamID, existing.Active = u.TeamID, u.Active
	return nil
}

func (r *MemoryActivityRepository) DeleteUser(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.users, id)
	return nil
}

func (r *MemoryActivityRepository) SaveTeam(_ context.Context, t *model.Team) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *t
	r.teams[t.ID] = &cp
	return nil
}

func (r *MemoryActivityRepository) DeleteTeam(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.teams, id)
	for _, u := range r.users {
		if u.TeamID == id {
			u.TeamID = ""
		}
	}
	return nil
}

func (r *MemoryActivityRepository) Teams(_ context.Context) ([]*model.Team, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]*model.Team, 0, len(r.teams))
	for _, t := range r.teams {
		cp := *t
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

// SaveUser é idempotente: um cadastro entregue de novo não zera os contadores.
func (r *MemoryActivityRepository) SaveUser(_ context.Context, u *model.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.users[u.ID]; ok {
		return nil
	}
	cp := *u
	r.users[u.ID] = &cp
	return nil
}

// SaveLogin é idempotente (chave EventID) e atualiza o resumo do usuário.
// Sem UserID, o usuário é procurado pelo login digitado (email ou username).
func (r *MemoryActivityRepository) SaveLogin(_ context.Context, a *model.LoginAttempt) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.logins[a.EventID]; ok {
		return nil
	}
	cp := *a
	r.logins[a.EventID] = &cp

	u := r.users[a.UserID]
	if u == nil && a.Login != "" {
		u = r.findByLogin(a.Login)
	}
	if u == nil {
		return nil
	}
	cp.UserID = u.ID
	if a.Success {
		u.LoginsOK++
		if a.OccurredAt.After(u.LastLoginAt) {
			u.LastLoginAt = a.OccurredAt
		}
	} else {
		u.LoginsFailed++
	}
	return nil
}

func (r *MemoryActivityRepository) findByLogin(login string) *model.User {
	for _, u := range r.users {
		if u.Username == login || u.Email == strings.ToLower(login) {
			return u
		}
	}
	return nil
}

// Users retorna os usuários do escopo em ordem de cadastro.
func (r *MemoryActivityRepository) Users(_ context.Context, scope model.Scope) ([]*model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]*model.User, 0, len(r.users))
	for _, u := range r.users {
		if !scope.Match(u) {
			continue
		}
		cp := *u
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].RegisteredAt.Before(out[j].RegisteredAt) })
	return out, nil
}

// Logins retorna as tentativas da mais recente para a mais antiga.
func (r *MemoryActivityRepository) Logins(_ context.Context) ([]*model.LoginAttempt, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]*model.LoginAttempt, 0, len(r.logins))
	for _, a := range r.logins {
		cp := *a
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].OccurredAt.After(out[j].OccurredAt) })
	return out, nil
}
