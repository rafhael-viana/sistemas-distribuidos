package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rafhael-viana/TCC/internal/auth/model"
	"github.com/rafhael-viana/TCC/internal/database"
)

// Schema cria as tabelas do serviço de autenticação. Email e username são
// únicos sem diferenciar maiúsculas, como no repositório em memória.
const Schema = `
CREATE TABLE IF NOT EXISTS users (
	id            TEXT PRIMARY KEY,
	name          TEXT NOT NULL,
	username      TEXT NOT NULL,
	email         TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	created_at    TIMESTAMPTZ NOT NULL
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'profissional';
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (lower(username));
`

type PostgresUserRepository struct {
	db *pgxpool.Pool
}

func NewPostgresUserRepository(db *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) Create(ctx context.Context, u *model.User) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO users (id, name, username, email, role, password_hash, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		u.ID, u.Name, u.Username, u.Email, u.Role, u.PasswordHash, u.CreatedAt)

	if constraint, ok := database.IsUniqueViolation(err); ok {
		switch constraint {
		case "users_email_key":
			return ErrEmailTaken
		case "users_username_key":
			return ErrUsernameTaken
		}
	}
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

func (r *PostgresUserRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	return r.find(ctx, "lower(email) = lower($1)", email)
}

func (r *PostgresUserRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	return r.find(ctx, "lower(username) = lower($1)", username)
}

func (r *PostgresUserRepository) find(ctx context.Context, where string, arg string) (*model.User, error) {
	var u model.User
	err := r.db.QueryRow(ctx,
		`SELECT id, name, username, email, role, password_hash, created_at FROM users WHERE `+where, arg,
	).Scan(&u.ID, &u.Name, &u.Username, &u.Email, &u.Role, &u.PasswordHash, &u.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}
	u.CreatedAt = u.CreatedAt.UTC()
	return &u, nil
}
