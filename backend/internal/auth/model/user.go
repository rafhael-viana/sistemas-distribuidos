package model

import "time"

// Role define a área da plataforma que o usuário acessa.
type Role string

const (
	RoleProfissional Role = "profissional" // colaborador; padrão do cadastro público
	RoleGestao       Role = "gestao"       // RH/gestão
	RoleAdmin        Role = "admin"        // acesso a todas as áreas
)

func (r Role) Valid() bool {
	return r == RoleProfissional || r == RoleGestao || r == RoleAdmin
}

type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	Role         Role      `json:"role"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}
