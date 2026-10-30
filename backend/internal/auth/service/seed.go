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
)

// SeedUser é uma conta do arquivo de seed (veja seed/users.example.json).
type SeedUser struct {
	RegisterInput
	Role model.Role `json:"role"`
}

// SeedFromFile cria as contas listadas no arquivo JSON que ainda não existem.
// Arquivo ausente não é erro: o seed é opcional.
func (s *AuthService) SeedFromFile(ctx context.Context, path string) error {
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("read seed file: %w", err)
	}

	var users []SeedUser
	if err := json.Unmarshal(data, &users); err != nil {
		return fmt.Errorf("parse seed file %s: %w", path, err)
	}
	for _, su := range users {
		u, created, err := s.EnsureUser(ctx, su.RegisterInput, su.Role)
		if err != nil {
			return fmt.Errorf("seed user %s: %w", su.Email, err)
		}
		if created {
			log.Printf("seed: created %s user %s", u.Role, u.Username)
		}
	}
	return nil
}
