package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rafhael-viana/TCC/internal/database"
	"github.com/rafhael-viana/TCC/internal/report/model"
)

// Schema cria as tabelas do gerador de relatórios: os pedidos e a cópia
// local dos dados do auth usada para montar os relatórios.
const Schema = `
CREATE TABLE IF NOT EXISTS reports (
	id           TEXT PRIMARY KEY,
	type         TEXT NOT NULL,
	format       TEXT NOT NULL,
	status       TEXT NOT NULL,
	error        TEXT NOT NULL DEFAULT '',
	object_key   TEXT NOT NULL DEFAULT '',
	size         INTEGER NOT NULL DEFAULT 0,
	created_at   TIMESTAMPTZ NOT NULL,
	completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports (created_at DESC);

CREATE TABLE IF NOT EXISTS report_users (
	id            TEXT PRIMARY KEY,
	name          TEXT NOT NULL,
	username      TEXT NOT NULL,
	email         TEXT NOT NULL,
	registered_at TIMESTAMPTZ NOT NULL,
	logins_ok     INTEGER NOT NULL DEFAULT 0,
	logins_failed INTEGER NOT NULL DEFAULT 0,
	last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS login_attempts (
	event_id    TEXT PRIMARY KEY,
	user_id     TEXT NOT NULL DEFAULT '',
	login       TEXT NOT NULL DEFAULT '',
	success     BOOLEAN NOT NULL,
	reason      TEXT NOT NULL DEFAULT '',
	occurred_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_occurred_at_idx ON login_attempts (occurred_at DESC);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS team_ids TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS requested_by TEXT NOT NULL DEFAULT '';
ALTER TABLE report_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT '';
ALTER TABLE report_users ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE report_users ADD COLUMN IF NOT EXISTS team_id TEXT NOT NULL DEFAULT '';
ALTER TABLE report_users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS report_teams (
	id        TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	name      TEXT NOT NULL
);
`

const reportColumns = `id, type, format, status, error, object_key, size, created_at, completed_at, tenant_id, team_ids, requested_by`

type PostgresReportRepository struct {
	db *pgxpool.Pool
}

func NewPostgresReportRepository(db *pgxpool.Pool) *PostgresReportRepository {
	return &PostgresReportRepository{db: db}
}

func (r *PostgresReportRepository) Save(ctx context.Context, rep *model.Report) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO reports (`+reportColumns+`) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 ON CONFLICT (id) DO UPDATE SET
			status = EXCLUDED.status, error = EXCLUDED.error, object_key = EXCLUDED.object_key,
			size = EXCLUDED.size, completed_at = EXCLUDED.completed_at`,
		rep.ID, rep.Type, rep.Format, rep.Status, rep.Error, rep.ObjectKey, rep.Size,
		rep.CreatedAt, database.NullTime(rep.CompletedAt), rep.TenantID, nonNil(rep.TeamIDs), rep.RequestedBy)
	if err != nil {
		return fmt.Errorf("save report: %w", err)
	}
	return nil
}

func (r *PostgresReportRepository) FindByID(ctx context.Context, id string) (*model.Report, error) {
	rep, err := scanReport(r.db.QueryRow(ctx, `SELECT `+reportColumns+` FROM reports WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrReportNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find report: %w", err)
	}
	return rep, nil
}

// List retorna os relatórios do mais recente para o mais antigo.
func (r *PostgresReportRepository) List(ctx context.Context, tenantID string) ([]*model.Report, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+reportColumns+` FROM reports WHERE $1 = '' OR tenant_id = $1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list reports: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.Report, error) {
		return scanReport(row)
	})
	if err != nil {
		return nil, fmt.Errorf("list reports: %w", err)
	}
	return out, nil
}

func scanReport(row pgx.Row) (*model.Report, error) {
	var (
		rep         model.Report
		completedAt *time.Time
	)
	err := row.Scan(&rep.ID, &rep.Type, &rep.Format, &rep.Status, &rep.Error, &rep.ObjectKey,
		&rep.Size, &rep.CreatedAt, &completedAt, &rep.TenantID, &rep.TeamIDs, &rep.RequestedBy)
	if err != nil {
		return nil, err
	}
	rep.CreatedAt = rep.CreatedAt.UTC()
	rep.CompletedAt = database.TimeOrZero(completedAt)
	return &rep, nil
}

type PostgresActivityRepository struct {
	db *pgxpool.Pool
}

func NewPostgresActivityRepository(db *pgxpool.Pool) *PostgresActivityRepository {
	return &PostgresActivityRepository{db: db}
}

// SaveUser é idempotente: um cadastro entregue de novo não zera os contadores.
func (r *PostgresActivityRepository) SaveUser(ctx context.Context, u *model.User) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO report_users (id, name, username, email, role, tenant_id, team_id, active, registered_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (id) DO NOTHING`,
		u.ID, u.Name, u.Username, u.Email, u.Role, u.TenantID, u.TeamID, u.Active, u.RegisteredAt)
	if err != nil {
		return fmt.Errorf("save user: %w", err)
	}
	return nil
}

// SaveLogin é idempotente (chave EventID) e atualiza o resumo do usuário na
// mesma transação. Sem UserID, o usuário é procurado pelo login digitado
// (email ou username).
func (r *PostgresActivityRepository) SaveLogin(ctx context.Context, a *model.LoginAttempt) error {
	return pgx.BeginFunc(ctx, r.db, func(tx pgx.Tx) error {
		var userID string
		err := tx.QueryRow(ctx,
			`SELECT id FROM report_users
			 WHERE id = $1 OR ($2 <> '' AND (username = $2 OR email = lower($2)))
			 ORDER BY id = $1 DESC
			 LIMIT 1`,
			a.UserID, a.Login,
		).Scan(&userID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("find login user: %w", err)
		}

		tag, err := tx.Exec(ctx,
			`INSERT INTO login_attempts (event_id, user_id, login, success, reason, occurred_at)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (event_id) DO NOTHING`,
			a.EventID, userID, a.Login, a.Success, a.Reason, a.OccurredAt)
		if err != nil {
			return fmt.Errorf("save login: %w", err)
		}
		if tag.RowsAffected() == 0 || userID == "" {
			return nil // evento repetido ou usuário desconhecido
		}

		if a.Success {
			_, err = tx.Exec(ctx,
				`UPDATE report_users SET logins_ok = logins_ok + 1,
					last_login_at = GREATEST(last_login_at, $2)
				 WHERE id = $1`, userID, a.OccurredAt)
		} else {
			_, err = tx.Exec(ctx,
				`UPDATE report_users SET logins_failed = logins_failed + 1 WHERE id = $1`, userID)
		}
		if err != nil {
			return fmt.Errorf("update login summary: %w", err)
		}
		return nil
	})
}

func (r *PostgresActivityRepository) UpdateUser(ctx context.Context, u *model.User) error {
	_, err := r.db.Exec(ctx,
		`UPDATE report_users SET name = $2, role = $3, tenant_id = $4, team_id = $5, active = $6 WHERE id = $1`,
		u.ID, u.Name, u.Role, u.TenantID, u.TeamID, u.Active)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	return nil
}

func (r *PostgresActivityRepository) DeleteUser(ctx context.Context, id string) error {
	if _, err := r.db.Exec(ctx, `DELETE FROM report_users WHERE id = $1`, id); err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	return nil
}

func (r *PostgresActivityRepository) SaveTeam(ctx context.Context, t *model.Team) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO report_teams (id, tenant_id, name) VALUES ($1, $2, $3)
		 ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`, t.ID, t.TenantID, t.Name)
	if err != nil {
		return fmt.Errorf("save team: %w", err)
	}
	return nil
}

func (r *PostgresActivityRepository) DeleteTeam(ctx context.Context, id string) error {
	return pgx.BeginFunc(ctx, r.db, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `UPDATE report_users SET team_id = '' WHERE team_id = $1`, id); err != nil {
			return fmt.Errorf("clear team: %w", err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM report_teams WHERE id = $1`, id); err != nil {
			return fmt.Errorf("delete team: %w", err)
		}
		return nil
	})
}

func (r *PostgresActivityRepository) Teams(ctx context.Context) ([]*model.Team, error) {
	rows, err := r.db.Query(ctx, `SELECT id, tenant_id, name FROM report_teams ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list teams: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.Team, error) {
		var t model.Team
		err := row.Scan(&t.ID, &t.TenantID, &t.Name)
		return &t, err
	})
	if err != nil {
		return nil, fmt.Errorf("list teams: %w", err)
	}
	return out, nil
}

// Users retorna os usuários do escopo em ordem de cadastro.
func (r *PostgresActivityRepository) Users(ctx context.Context, scope model.Scope) ([]*model.User, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, username, email, role, tenant_id, team_id, active, registered_at, logins_ok, logins_failed, last_login_at
		 FROM report_users
		 WHERE ($1 = '' OR tenant_id = $1) AND (cardinality($2::text[]) = 0 OR team_id = ANY($2))
		 ORDER BY registered_at`, scope.TenantID, nonNil(scope.TeamIDs))
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.User, error) {
		var (
			u           model.User
			lastLoginAt *time.Time
		)
		err := row.Scan(&u.ID, &u.Name, &u.Username, &u.Email, &u.Role, &u.TenantID, &u.TeamID, &u.Active,
			&u.RegisteredAt, &u.LoginsOK, &u.LoginsFailed, &lastLoginAt)
		if err != nil {
			return nil, err
		}
		u.RegisteredAt = u.RegisteredAt.UTC()
		u.LastLoginAt = database.TimeOrZero(lastLoginAt)
		return &u, nil
	})
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	return out, nil
}

// Logins retorna as tentativas da mais recente para a mais antiga.
func (r *PostgresActivityRepository) Logins(ctx context.Context) ([]*model.LoginAttempt, error) {
	rows, err := r.db.Query(ctx,
		`SELECT event_id, user_id, login, success, reason, occurred_at
		 FROM login_attempts ORDER BY occurred_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list logins: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.LoginAttempt, error) {
		var a model.LoginAttempt
		if err := row.Scan(&a.EventID, &a.UserID, &a.Login, &a.Success, &a.Reason, &a.OccurredAt); err != nil {
			return nil, err
		}
		a.OccurredAt = a.OccurredAt.UTC()
		return &a, nil
	})
	if err != nil {
		return nil, fmt.Errorf("list logins: %w", err)
	}
	return out, nil
}

// nonNil evita gravar NULL em colunas TEXT[] NOT NULL.
func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
