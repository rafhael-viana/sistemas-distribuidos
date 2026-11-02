package service

import (
	"context"
	"crypto/rand"
	"strings"
	"time"

	"github.com/rafhael-viana/TCC/internal/auth/model"
	"github.com/rafhael-viana/TCC/internal/auth/repository"
	"github.com/rafhael-viana/TCC/internal/authn"
	"github.com/rafhael-viana/TCC/internal/events"
)

type TeamInput struct {
	Name     string `json:"name"`
	TenantID string `json:"tenant_id,omitempty"` // só admin informa; gestão usa a própria empresa
}

// scopeTenant devolve a empresa em que a operação acontece. Gestão fica presa à
// sua; admin precisa informar qual.
func scopeTenant(actor *authn.Claims, requested string) (string, error) {
	switch actor.Role {
	case authn.RoleAdmin:
		if requested == "" {
			return "", &ValidationError{"tenant_id is required"}
		}
		return requested, nil
	case authn.RoleGestao:
		return actor.TenantID, nil
	default:
		return "", ErrForbidden
	}
}

// canManage diz se o ator pode mexer em algo da empresa tenantID.
func canManage(actor *authn.Claims, tenantID string) bool {
	return actor.Role == authn.RoleAdmin || (actor.Role == authn.RoleGestao && actor.TenantID == tenantID)
}

func (s *AuthService) ListTeams(ctx context.Context, actor *authn.Claims, tenantID string) ([]*model.Team, error) {
	tenantID, err := scopeTenant(actor, tenantID)
	if err != nil {
		return nil, err
	}
	teams, err := s.teams.List(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	users, err := s.users.List(ctx, repository.UserFilter{TenantID: tenantID})
	if err != nil {
		return nil, err
	}
	counts := map[string]int{}
	for _, u := range users {
		counts[u.TeamID]++
	}
	for _, t := range teams {
		t.MembersCount = counts[t.ID]
	}
	return teams, nil
}

func (s *AuthService) CreateTeam(ctx context.Context, actor *authn.Claims, in TeamInput) (*model.Team, error) {
	tenantID, err := scopeTenant(actor, in.TenantID)
	if err != nil {
		return nil, err
	}
	if _, err := s.tenants.FindByID(ctx, tenantID); err != nil {
		return nil, err
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return nil, &ValidationError{"name is required"}
	}
	t := &model.Team{ID: "tm_" + strings.ToLower(rand.Text()[:10]), TenantID: tenantID, Name: name, CreatedAt: time.Now().UTC()}
	if err := s.teams.Create(ctx, t); err != nil {
		return nil, err
	}
	s.publishTeam(ctx, events.TypeTeamCreated, t, actor.UserID())
	return t, nil
}

func (s *AuthService) UpdateTeam(ctx context.Context, actor *authn.Claims, id string, in TeamInput) (*model.Team, error) {
	t, err := s.teams.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !canManage(actor, t.TenantID) {
		return nil, repository.ErrTeamNotFound
	}
	t.Name = strings.TrimSpace(in.Name)
	if t.Name == "" {
		return nil, &ValidationError{"name is required"}
	}
	if err := s.teams.Update(ctx, t); err != nil {
		return nil, err
	}
	s.publishTeam(ctx, events.TypeTeamUpdated, t, actor.UserID())
	return t, nil
}

// DeleteTeam remove a equipe; os membros ficam sem equipe.
func (s *AuthService) DeleteTeam(ctx context.Context, actor *authn.Claims, id string) error {
	t, err := s.teams.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if !canManage(actor, t.TenantID) {
		return repository.ErrTeamNotFound
	}
	if err := s.users.ClearTeam(ctx, id); err != nil {
		return err
	}
	if err := s.teams.Delete(ctx, id); err != nil {
		return err
	}
	s.publishTeam(ctx, events.TypeTeamDeleted, t, actor.UserID())
	return nil
}

func (s *AuthService) publishTeam(ctx context.Context, typ string, t *model.Team, actorID string) {
	s.publish(ctx, t.ID, typ, t.TenantID, events.TeamChanged{TeamID: t.ID, TenantID: t.TenantID, Name: t.Name, ActorID: actorID})
}
