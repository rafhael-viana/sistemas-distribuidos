package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"

	"github.com/rafhael-viana/TCC/internal/auth/model"
	"github.com/rafhael-viana/TCC/internal/auth/repository"
	"github.com/rafhael-viana/TCC/internal/authn"
)

// Seed é o conteúdo do arquivo de seed (veja seed/users.example.json).
type Seed struct {
	Tenants []SeedTenant `json:"tenants"`
	Teams   []SeedTeam   `json:"teams"`
	Users   []SeedUser   `json:"users"`
}

type SeedTenant struct {
	TenantInput
}

type SeedTeam struct {
	Tenant string `json:"tenant"`
	Name   string `json:"name"`
}

type SeedUser struct {
	RegisterInput
	Role   model.Role `json:"role"`
	Tenant string     `json:"tenant,omitempty"` // id da empresa
	Team   string     `json:"team,omitempty"`   // nome da equipe
}

// seedActor é o "usuário" que executa o seed: um admin da plataforma.
var seedActor = &authn.Claims{Role: authn.RoleAdmin}

// SeedFromFile cria empresas, equipes e usuários do arquivo que ainda não
// existem. Arquivo ausente não é erro: o seed é opcional. Também aceita o
// formato antigo, só com a lista de usuários.
func (s *AuthService) SeedFromFile(ctx context.Context, path string) error {
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("read seed file: %w", err)
	}

	var seed Seed
	if err := json.Unmarshal(data, &seed); err != nil {
		if err := json.Unmarshal(data, &seed.Users); err != nil {
			return fmt.Errorf("parse seed file %s: %w", path, err)
		}
	}

	for _, st := range seed.Tenants {
		if _, err := s.tenants.FindByID(ctx, st.ID); err == nil {
			continue
		}
		t, err := s.CreateTenant(ctx, seedActor, st.TenantInput)
		if err != nil {
			return fmt.Errorf("seed tenant %s: %w", st.ID, err)
		}
		log.Printf("seed: created tenant %s", t.ID)
	}
	for _, st := range seed.Teams {
		if _, err := s.teams.FindByName(ctx, st.Tenant, st.Name); err == nil {
			continue
		}
		if _, err := s.CreateTeam(ctx, seedActor, TeamInput{Name: st.Name, TenantID: st.Tenant}); err != nil {
			return fmt.Errorf("seed team %s: %w", st.Name, err)
		}
	}
	for _, su := range seed.Users {
		if _, err := s.users.FindByEmail(ctx, su.Email); err == nil {
			continue
		}
		if !su.Role.Valid() {
			return fmt.Errorf("seed user %s: invalid role %q", su.Email, su.Role)
		}
		teamID := ""
		if su.Team != "" {
			team, err := s.teams.FindByName(ctx, su.Tenant, su.Team)
			if err != nil {
				return fmt.Errorf("seed user %s: team %q: %w", su.Email, su.Team, err)
			}
			teamID = team.ID
		}
		if su.Role != model.RoleAdmin && su.Tenant != "" {
			if _, err := s.tenants.FindByID(ctx, su.Tenant); errors.Is(err, repository.ErrTenantNotFound) {
				return fmt.Errorf("seed user %s: tenant %q not found", su.Email, su.Tenant)
			}
		}
		u, err := s.create(ctx, su.RegisterInput, su.Role, su.Tenant, teamID, "")
		if err != nil {
			return fmt.Errorf("seed user %s: %w", su.Email, err)
		}
		log.Printf("seed: created %s user %s", u.Role, u.Username)
	}
	return nil
}
