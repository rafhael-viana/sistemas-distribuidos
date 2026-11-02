package service

import (
	"context"
	"crypto/rand"
	"errors"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/rafhael-viana/TCC/internal/auth/model"
	"github.com/rafhael-viana/TCC/internal/auth/repository"
	"github.com/rafhael-viana/TCC/internal/authn"
	"github.com/rafhael-viana/TCC/internal/events"
)

// Limites padrão de cada plano, usados quando a criação não informa outros.
var planDefaults = map[model.Plan]struct{ maxUsers, rateLimit int }{
	model.PlanStarter:    {50, 200},
	model.PlanBusiness:   {250, 600},
	model.PlanEnterprise: {500, 1000},
}

// TenantInput serve para criar e editar. Na edição, campos nil não mudam.
type TenantInput struct {
	ID         string              `json:"id,omitempty"` // só na criação; vazio = gerado do nome
	Name       *string             `json:"name"`
	Plan       *model.Plan         `json:"plan"`
	Status     *model.TenantStatus `json:"status"`
	MaxUsers   *int                `json:"max_users"`
	RateLimit  *int                `json:"rate_limit"`
	Domains    *[]string           `json:"domains"`
	InviteCode *string             `json:"invite_code"`
}

func requireAdmin(actor *authn.Claims) error {
	if actor.Role != authn.RoleAdmin {
		return ErrForbidden
	}
	return nil
}

func (s *AuthService) ListTenants(ctx context.Context, actor *authn.Claims) ([]*model.Tenant, error) {
	if err := requireAdmin(actor); err != nil {
		return nil, err
	}
	tenants, err := s.tenants.List(ctx)
	if err != nil {
		return nil, err
	}
	users, err := s.users.List(ctx, repository.UserFilter{})
	if err != nil {
		return nil, err
	}
	counts := map[string]int{}
	for _, u := range users {
		counts[u.TenantID]++
	}
	for _, t := range tenants {
		t.UsersCount = counts[t.ID]
	}
	return tenants, nil
}

func (s *AuthService) GetTenant(ctx context.Context, actor *authn.Claims, id string) (*model.Tenant, error) {
	if actor.Role != authn.RoleAdmin && actor.TenantID != id {
		return nil, ErrForbidden
	}
	t, err := s.tenants.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	members, err := s.users.List(ctx, repository.UserFilter{TenantID: id})
	if err != nil {
		return nil, err
	}
	t.UsersCount = len(members)
	return t, nil
}

func (s *AuthService) CreateTenant(ctx context.Context, actor *authn.Claims, in TenantInput) (*model.Tenant, error) {
	if err := requireAdmin(actor); err != nil {
		return nil, err
	}
	t := &model.Tenant{Plan: model.PlanBusiness, Status: model.TenantActive, CreatedAt: time.Now().UTC(), Domains: []string{}}
	if in.Plan != nil {
		t.Plan = *in.Plan
	}
	defaults := planDefaults[t.Plan]
	t.MaxUsers, t.RateLimit = defaults.maxUsers, defaults.rateLimit
	if err := applyTenant(t, in); err != nil {
		return nil, err
	}
	if t.InviteCode == "" {
		t.InviteCode = "ORG-" + rand.Text()[:6]
	}
	t.ID = in.ID
	if t.ID == "" {
		t.ID = "tn_" + slug(t.Name)
	}
	if !validTenantID.MatchString(t.ID) {
		return nil, &ValidationError{"id must look like tn_nome (lowercase letters, digits and _)"}
	}
	if err := s.tenants.Create(ctx, t); err != nil {
		return nil, err
	}
	s.publishTenant(ctx, events.TypeTenantCreated, t, actor.UserID())
	return t, nil
}

func (s *AuthService) UpdateTenant(ctx context.Context, actor *authn.Claims, id string, in TenantInput) (*model.Tenant, error) {
	if err := requireAdmin(actor); err != nil {
		return nil, err
	}
	t, err := s.tenants.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	before := t.Status
	if err := applyTenant(t, in); err != nil {
		return nil, err
	}
	if err := s.tenants.Update(ctx, t); err != nil {
		return nil, err
	}

	typ := events.TypeTenantUpdated
	switch {
	case before != model.TenantSuspended && t.Status == model.TenantSuspended:
		typ = events.TypeTenantSuspended
	case before == model.TenantSuspended && t.Status != model.TenantSuspended:
		typ = events.TypeTenantReactivated
	}
	s.publishTenant(ctx, typ, t, actor.UserID())
	return s.GetTenant(ctx, actor, id)
}

// DeleteTenant só remove empresas sem usuários; as equipes vão junto.
func (s *AuthService) DeleteTenant(ctx context.Context, actor *authn.Claims, id string) error {
	if err := requireAdmin(actor); err != nil {
		return err
	}
	t, err := s.tenants.FindByID(ctx, id)
	if err != nil {
		return err
	}
	members, err := s.users.List(ctx, repository.UserFilter{TenantID: id})
	if err != nil {
		return err
	}
	if len(members) > 0 {
		return ErrTenantNotEmpty
	}
	teams, err := s.teams.List(ctx, id)
	if err != nil {
		return err
	}
	for _, team := range teams {
		if err := s.teams.Delete(ctx, team.ID); err != nil && !errors.Is(err, repository.ErrTeamNotFound) {
			return err
		}
	}
	if err := s.tenants.Delete(ctx, id); err != nil {
		return err
	}
	s.publishTenant(ctx, events.TypeTenantDeleted, t, actor.UserID())
	return nil
}

var (
	validTenantID = regexp.MustCompile(`^tn_[a-z0-9_]{2,40}$`)
	validDomain   = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$`)
	nonSlug       = regexp.MustCompile(`[^a-z0-9]+`)
)

func applyTenant(t *model.Tenant, in TenantInput) error {
	if in.Name != nil {
		t.Name = strings.TrimSpace(*in.Name)
	}
	if in.Plan != nil {
		t.Plan = *in.Plan
	}
	if in.Status != nil {
		t.Status = *in.Status
	}
	if in.MaxUsers != nil {
		t.MaxUsers = *in.MaxUsers
	}
	if in.RateLimit != nil {
		t.RateLimit = *in.RateLimit
	}
	if in.InviteCode != nil {
		t.InviteCode = strings.ToUpper(strings.TrimSpace(*in.InviteCode))
	}
	if in.Domains != nil {
		domains := []string{}
		for _, d := range *in.Domains {
			d = strings.ToLower(strings.TrimSpace(strings.TrimPrefix(d, "@")))
			if d == "" || slices.Contains(domains, d) {
				continue
			}
			if !validDomain.MatchString(d) {
				return &ValidationError{"invalid domain: " + d}
			}
			domains = append(domains, d)
		}
		t.Domains = domains
	}

	switch {
	case t.Name == "":
		return &ValidationError{"name is required"}
	case !t.Plan.Valid():
		return &ValidationError{"plan must be one of: starter, business, enterprise"}
	case !t.Status.Valid():
		return &ValidationError{"status must be one of: active, trial, suspended"}
	case t.MaxUsers < 1:
		return &ValidationError{"max_users must be at least 1"}
	case t.RateLimit < 0:
		return &ValidationError{"rate_limit must not be negative"}
	case in.InviteCode != nil && len(t.InviteCode) < 4:
		return &ValidationError{"invite_code must have at least 4 characters"}
	}
	return nil
}

func slug(name string) string {
	s := strings.ToLower(name)
	s = strings.NewReplacer("á", "a", "à", "a", "â", "a", "ã", "a", "é", "e", "ê", "e", "í", "i",
		"ó", "o", "ô", "o", "õ", "o", "ú", "u", "ç", "c").Replace(s)
	s = strings.Trim(nonSlug.ReplaceAllString(s, "_"), "_")
	if len(s) > 30 {
		s = s[:30]
	}
	if len(s) < 2 {
		s = strings.ToLower(rand.Text()[:6])
	}
	return s
}

func (s *AuthService) publishTenant(ctx context.Context, typ string, t *model.Tenant, actorID string) {
	s.publish(ctx, t.ID, typ, t.ID, events.TenantChanged{
		TenantID: t.ID,
		Name:     t.Name,
		Plan:     string(t.Plan),
		Status:   string(t.Status),
		MaxUsers: t.MaxUsers,
		ActorID:  actorID,
	})
}
