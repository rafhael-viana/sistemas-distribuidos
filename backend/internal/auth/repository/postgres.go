package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rafhael-viana/TCC/internal/auth/model"
	"github.com/rafhael-viana/TCC/internal/database"
)

// Schema cria as tabelas do serviço de autenticação. Email e username são
// únicos sem diferenciar maiúsculas, como no repositório em memória. Os
// ALTER TABLE atualizam bancos criados por versões anteriores.
const Schema = `
CREATE TABLE IF NOT EXISTS users (
	id            TEXT PRIMARY KEY,
	name          TEXT NOT NULL,
	username      TEXT NOT NULL,
	email         TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	created_at    TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (lower(username));
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'profissional';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS tenants (
	id          TEXT PRIMARY KEY,
	name        TEXT NOT NULL,
	plan        TEXT NOT NULL,
	status      TEXT NOT NULL,
	max_users   INTEGER NOT NULL,
	rate_limit  INTEGER NOT NULL,
	domains     TEXT[] NOT NULL DEFAULT '{}',
	invite_code TEXT NOT NULL,
	created_at  TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_invite_code_key ON tenants (lower(invite_code));

CREATE TABLE IF NOT EXISTS teams (
	id         TEXT PRIMARY KEY,
	tenant_id  TEXT NOT NULL,
	name       TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS teams_tenant_name_key ON teams (tenant_id, lower(name));
`

const userColumns = `id, name, username, email, role, tenant_id, team_id, active, password_hash, created_at`

type PostgresUserRepository struct {
	db *pgxpool.Pool
}

func NewPostgresUserRepository(db *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

func userConflict(err error) error {
	if constraint, ok := database.IsUniqueViolation(err); ok {
		switch constraint {
		case "users_email_key":
			return ErrEmailTaken
		case "users_username_key":
			return ErrUsernameTaken
		}
	}
	return nil
}

func (r *PostgresUserRepository) Create(ctx context.Context, u *model.User) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO users (`+userColumns+`) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		u.ID, u.Name, u.Username, u.Email, u.Role, u.TenantID, u.TeamID, u.Active, u.PasswordHash, u.CreatedAt)
	if cErr := userConflict(err); cErr != nil {
		return cErr
	}
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

func (r *PostgresUserRepository) Update(ctx context.Context, u *model.User) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE users SET name = $2, role = $3, tenant_id = $4, team_id = $5, active = $6, password_hash = $7
		 WHERE id = $1`,
		u.ID, u.Name, u.Role, u.TenantID, u.TeamID, u.Active, u.PasswordHash)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *PostgresUserRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *PostgresUserRepository) FindByID(ctx context.Context, id string) (*model.User, error) {
	return r.find(ctx, "id = $1", id)
}

func (r *PostgresUserRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	return r.find(ctx, "lower(email) = lower($1)", email)
}

func (r *PostgresUserRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	return r.find(ctx, "lower(username) = lower($1)", username)
}

func (r *PostgresUserRepository) find(ctx context.Context, where string, arg string) (*model.User, error) {
	u, err := scanUser(r.db.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE `+where, arg))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}
	return u, nil
}

func (r *PostgresUserRepository) List(ctx context.Context, f UserFilter) ([]*model.User, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+userColumns+` FROM users
		 WHERE ($1 = '' OR tenant_id = $1) AND ($2 = '' OR team_id = $2) AND ($3 = '' OR role = $3)
		   AND ($4 = '' OR name ILIKE '%' || $4 || '%' OR username ILIKE '%' || $4 || '%' OR email ILIKE '%' || $4 || '%')
		 ORDER BY lower(name)`,
		f.TenantID, f.TeamID, string(f.Role), strings.TrimSpace(f.Query))
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.User, error) { return scanUser(row) })
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	return out, nil
}

func (r *PostgresUserRepository) ClearTeam(ctx context.Context, teamID string) error {
	if _, err := r.db.Exec(ctx, `UPDATE users SET team_id = '' WHERE team_id = $1`, teamID); err != nil {
		return fmt.Errorf("clear team: %w", err)
	}
	return nil
}

func scanUser(row pgx.Row) (*model.User, error) {
	var u model.User
	err := row.Scan(&u.ID, &u.Name, &u.Username, &u.Email, &u.Role, &u.TenantID, &u.TeamID, &u.Active,
		&u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = u.CreatedAt.UTC()
	return &u, nil
}

const tenantColumns = `id, name, plan, status, max_users, rate_limit, domains, invite_code, created_at`

type PostgresTenantRepository struct {
	db *pgxpool.Pool
}

func NewPostgresTenantRepository(db *pgxpool.Pool) *PostgresTenantRepository {
	return &PostgresTenantRepository{db: db}
}

func tenantConflict(err error) error {
	if constraint, ok := database.IsUniqueViolation(err); ok {
		switch constraint {
		case "tenants_pkey":
			return ErrTenantIDTaken
		case "tenants_invite_code_key":
			return ErrInviteCodeTaken
		}
	}
	return nil
}

func (r *PostgresTenantRepository) Create(ctx context.Context, t *model.Tenant) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO tenants (`+tenantColumns+`) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		t.ID, t.Name, t.Plan, t.Status, t.MaxUsers, t.RateLimit, t.Domains, t.InviteCode, t.CreatedAt)
	if cErr := tenantConflict(err); cErr != nil {
		return cErr
	}
	if err != nil {
		return fmt.Errorf("insert tenant: %w", err)
	}
	return nil
}

func (r *PostgresTenantRepository) Update(ctx context.Context, t *model.Tenant) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE tenants SET name = $2, plan = $3, status = $4, max_users = $5, rate_limit = $6,
			domains = $7, invite_code = $8
		 WHERE id = $1`,
		t.ID, t.Name, t.Plan, t.Status, t.MaxUsers, t.RateLimit, t.Domains, t.InviteCode)
	if cErr := tenantConflict(err); cErr != nil {
		return cErr
	}
	if err != nil {
		return fmt.Errorf("update tenant: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrTenantNotFound
	}
	return nil
}

func (r *PostgresTenantRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM tenants WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete tenant: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrTenantNotFound
	}
	return nil
}

func (r *PostgresTenantRepository) FindByID(ctx context.Context, id string) (*model.Tenant, error) {
	return r.find(ctx, "id = $1", id)
}

func (r *PostgresTenantRepository) FindByInviteCode(ctx context.Context, code string) (*model.Tenant, error) {
	return r.find(ctx, "lower(invite_code) = lower($1)", code)
}

func (r *PostgresTenantRepository) FindByDomain(ctx context.Context, domain string) (*model.Tenant, error) {
	return r.find(ctx, "lower($1) = ANY(domains)", domain)
}

func (r *PostgresTenantRepository) find(ctx context.Context, where, arg string) (*model.Tenant, error) {
	t, err := scanTenant(r.db.QueryRow(ctx, `SELECT `+tenantColumns+` FROM tenants WHERE `+where+` LIMIT 1`, arg))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrTenantNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find tenant: %w", err)
	}
	return t, nil
}

func (r *PostgresTenantRepository) List(ctx context.Context) ([]*model.Tenant, error) {
	rows, err := r.db.Query(ctx, `SELECT `+tenantColumns+` FROM tenants ORDER BY lower(name)`)
	if err != nil {
		return nil, fmt.Errorf("list tenants: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.Tenant, error) { return scanTenant(row) })
	if err != nil {
		return nil, fmt.Errorf("list tenants: %w", err)
	}
	return out, nil
}

func scanTenant(row pgx.Row) (*model.Tenant, error) {
	var t model.Tenant
	err := row.Scan(&t.ID, &t.Name, &t.Plan, &t.Status, &t.MaxUsers, &t.RateLimit, &t.Domains, &t.InviteCode, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	t.CreatedAt = t.CreatedAt.UTC()
	return &t, nil
}

type PostgresTeamRepository struct {
	db *pgxpool.Pool
}

func NewPostgresTeamRepository(db *pgxpool.Pool) *PostgresTeamRepository {
	return &PostgresTeamRepository{db: db}
}

func teamConflict(err error) error {
	if constraint, ok := database.IsUniqueViolation(err); ok && constraint == "teams_tenant_name_key" {
		return ErrTeamNameTaken
	}
	return nil
}

func (r *PostgresTeamRepository) Create(ctx context.Context, t *model.Team) error {
	_, err := r.db.Exec(ctx, `INSERT INTO teams (id, tenant_id, name, created_at) VALUES ($1, $2, $3, $4)`,
		t.ID, t.TenantID, t.Name, t.CreatedAt)
	if cErr := teamConflict(err); cErr != nil {
		return cErr
	}
	if err != nil {
		return fmt.Errorf("insert team: %w", err)
	}
	return nil
}

func (r *PostgresTeamRepository) Update(ctx context.Context, t *model.Team) error {
	tag, err := r.db.Exec(ctx, `UPDATE teams SET name = $2 WHERE id = $1`, t.ID, t.Name)
	if cErr := teamConflict(err); cErr != nil {
		return cErr
	}
	if err != nil {
		return fmt.Errorf("update team: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrTeamNotFound
	}
	return nil
}

func (r *PostgresTeamRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM teams WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete team: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrTeamNotFound
	}
	return nil
}

func (r *PostgresTeamRepository) FindByID(ctx context.Context, id string) (*model.Team, error) {
	return r.findOne(ctx, `id = $1`, id)
}

func (r *PostgresTeamRepository) FindByName(ctx context.Context, tenantID, name string) (*model.Team, error) {
	return r.findOne(ctx, `tenant_id = $1 AND lower(name) = lower($2)`, tenantID, name)
}

func (r *PostgresTeamRepository) findOne(ctx context.Context, where string, args ...any) (*model.Team, error) {
	var t model.Team
	err := r.db.QueryRow(ctx, `SELECT id, tenant_id, name, created_at FROM teams WHERE `+where, args...).
		Scan(&t.ID, &t.TenantID, &t.Name, &t.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrTeamNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find team: %w", err)
	}
	t.CreatedAt = t.CreatedAt.UTC()
	return &t, nil
}

func (r *PostgresTeamRepository) List(ctx context.Context, tenantID string) ([]*model.Team, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tenant_id, name, created_at FROM teams WHERE ($1 = '' OR tenant_id = $1) ORDER BY lower(name)`,
		tenantID)
	if err != nil {
		return nil, fmt.Errorf("list teams: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.Team, error) {
		var t model.Team
		if err := row.Scan(&t.ID, &t.TenantID, &t.Name, &t.CreatedAt); err != nil {
			return nil, err
		}
		t.CreatedAt = t.CreatedAt.UTC()
		return &t, nil
	})
	if err != nil {
		return nil, fmt.Errorf("list teams: %w", err)
	}
	return out, nil
}
