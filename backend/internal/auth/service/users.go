package service

import (
	"context"
	"errors"
	"strings"

	"github.com/rafhael-viana/TCC/internal/auth/model"
	"github.com/rafhael-viana/TCC/internal/auth/repository"
	"github.com/rafhael-viana/TCC/internal/authn"
	"github.com/rafhael-viana/TCC/internal/events"
)

type CreateUserInput struct {
	RegisterInput
	Role     model.Role `json:"role"`
	TeamID   string     `json:"team_id,omitempty"`
	TenantID string     `json:"tenant_id,omitempty"` // só admin informa
}

// UpdateUserInput altera só os campos informados.
type UpdateUserInput struct {
	Name     *string     `json:"name"`
	Role     *model.Role `json:"role"`
	TeamID   *string     `json:"team_id"`
	Active   *bool       `json:"active"`
	Password *string     `json:"password"`
}

type ListUsersInput struct {
	TenantID string
	TeamID   string
	Role     model.Role
	Query    string
}

func (s *AuthService) ListUsers(ctx context.Context, actor *authn.Claims, in ListUsersInput) ([]*model.User, error) {
	f := repository.UserFilter{TeamID: in.TeamID, Role: in.Role, Query: in.Query}
	switch actor.Role {
	case authn.RoleAdmin:
		f.TenantID = in.TenantID // vazio = todas as empresas
	case authn.RoleGestao:
		f.TenantID = actor.TenantID
	default:
		return nil, ErrForbidden
	}
	return s.users.List(ctx, f)
}

func (s *AuthService) CreateUser(ctx context.Context, actor *authn.Claims, in CreateUserInput) (*model.User, error) {
	if in.Role == "" {
		in.Role = model.RoleProfissional
	}
	if !in.Role.Valid() {
		return nil, &ValidationError{"role must be one of: profissional, gestao, admin"}
	}
	if in.Role == model.RoleAdmin {
		// Admin é da plataforma, sem empresa, e só outro admin cria.
		if actor.Role != authn.RoleAdmin {
			return nil, ErrForbidden
		}
		return s.create(ctx, in.RegisterInput, in.Role, "", "", actor.UserID())
	}

	tenantID, err := scopeTenant(actor, in.TenantID)
	if err != nil {
		return nil, err
	}
	tenant, err := s.tenants.FindByID(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if err := s.checkJoin(ctx, tenant, strings.ToLower(strings.TrimSpace(in.Email))); err != nil {
		return nil, err
	}
	if err := s.checkTeam(ctx, tenantID, in.TeamID); err != nil {
		return nil, err
	}
	return s.create(ctx, in.RegisterInput, in.Role, tenantID, in.TeamID, actor.UserID())
}

func (s *AuthService) UpdateUser(ctx context.Context, actor *authn.Claims, id string, in UpdateUserInput) (*model.User, error) {
	u, err := s.managedUser(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	self := u.ID == actor.UserID()

	if in.Name != nil {
		if u.Name = strings.TrimSpace(*in.Name); u.Name == "" {
			return nil, &ValidationError{"name is required"}
		}
	}
	if in.Role != nil && *in.Role != u.Role {
		switch {
		case self:
			return nil, &ValidationError{"you cannot change your own role"}
		case !in.Role.Valid():
			return nil, &ValidationError{"role must be one of: profissional, gestao, admin"}
		case *in.Role == model.RoleAdmin || u.Role == model.RoleAdmin:
			return nil, &ValidationError{"admin accounts are managed separately"}
		}
		u.Role = *in.Role
	}
	if in.TeamID != nil {
		if err := s.checkTeam(ctx, u.TenantID, *in.TeamID); err != nil {
			return nil, err
		}
		u.TeamID = *in.TeamID
	}
	if in.Active != nil {
		if self && !*in.Active {
			return nil, &ValidationError{"you cannot deactivate yourself"}
		}
		u.Active = *in.Active
	}
	if in.Password != nil {
		if u.PasswordHash, err = hashPassword(*in.Password); err != nil {
			return nil, err
		}
	}

	if err := s.users.Update(ctx, u); err != nil {
		return nil, err
	}
	s.publish(ctx, u.ID, events.TypeUserUpdated, u.TenantID, events.UserUpdated{
		UserID:   u.ID,
		Name:     u.Name,
		Role:     string(u.Role),
		TenantID: u.TenantID,
		TeamID:   u.TeamID,
		Active:   u.Active,
		ActorID:  actor.UserID(),
	})
	return u, nil
}

func (s *AuthService) DeleteUser(ctx context.Context, actor *authn.Claims, id string) error {
	u, err := s.managedUser(ctx, actor, id)
	if err != nil {
		return err
	}
	if u.ID == actor.UserID() {
		return &ValidationError{"you cannot delete yourself"}
	}
	if err := s.users.Delete(ctx, id); err != nil {
		return err
	}
	s.publish(ctx, u.ID, events.TypeUserDeleted, u.TenantID, events.UserDeleted{UserID: u.ID, ActorID: actor.UserID()})
	return nil
}

// managedUser busca um usuário que o ator pode administrar. Fora do escopo,
// responde como inexistente para não revelar contas de outras empresas.
func (s *AuthService) managedUser(ctx context.Context, actor *authn.Claims, id string) (*model.User, error) {
	u, err := s.users.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !canManage(actor, u.TenantID) || (actor.Role != authn.RoleAdmin && u.Role == model.RoleAdmin) {
		return nil, repository.ErrUserNotFound
	}
	return u, nil
}

// checkTeam confere que a equipe (se informada) é da empresa.
func (s *AuthService) checkTeam(ctx context.Context, tenantID, teamID string) error {
	if teamID == "" {
		return nil
	}
	t, err := s.teams.FindByID(ctx, teamID)
	if errors.Is(err, repository.ErrTeamNotFound) || (err == nil && t.TenantID != tenantID) {
		return &ValidationError{"team not found in this organization"}
	}
	return err
}
