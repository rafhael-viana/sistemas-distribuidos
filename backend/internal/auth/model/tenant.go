package model

import "time"

type Plan string

const (
	PlanStarter    Plan = "starter"
	PlanBusiness   Plan = "business"
	PlanEnterprise Plan = "enterprise"
)

func (p Plan) Valid() bool {
	return p == PlanStarter || p == PlanBusiness || p == PlanEnterprise
}

type TenantStatus string

const (
	TenantActive    TenantStatus = "active"
	TenantTrial     TenantStatus = "trial"
	TenantSuspended TenantStatus = "suspended"
)

func (s TenantStatus) Valid() bool {
	return s == TenantActive || s == TenantTrial || s == TenantSuspended
}

// Tenant é uma empresa cliente. Os colaboradores se cadastram pelo código de
// convite ou pelo domínio do e-mail; suspensa, ninguém dela acessa.
type Tenant struct {
	ID         string       `json:"id"`
	Name       string       `json:"name"`
	Plan       Plan         `json:"plan"`
	Status     TenantStatus `json:"status"`
	MaxUsers   int          `json:"max_users"`
	RateLimit  int          `json:"rate_limit"` // requisições por minuto, somadas de todos os usuários
	Domains    []string     `json:"domains"`
	InviteCode string       `json:"invite_code"`
	CreatedAt  time.Time    `json:"created_at"`
	UsersCount int          `json:"users_count"` // calculado na listagem
}

// Team agrupa usuários de uma empresa para relatórios e ciclos de pesquisa.
type Team struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"created_at"`
	MembersCount int       `json:"members_count"` // calculado na listagem
}
