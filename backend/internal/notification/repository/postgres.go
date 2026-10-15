package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rafhael-viana/TCC/internal/database"
	"github.com/rafhael-viana/TCC/internal/notification/model"
)

// Schema cria as tabelas do serviço de notificação.
const Schema = `
CREATE TABLE IF NOT EXISTS emails (
	id         TEXT PRIMARY KEY,
	recipient  TEXT NOT NULL,
	subject    TEXT NOT NULL,
	body       TEXT NOT NULL,
	status     TEXT NOT NULL,
	error      TEXT NOT NULL DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL,
	sent_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS emails_created_at_idx ON emails (created_at DESC);
`

const emailColumns = `id, recipient, subject, body, status, error, created_at, sent_at`

type PostgresEmailRepository struct {
	db *pgxpool.Pool
}

func NewPostgresEmailRepository(db *pgxpool.Pool) *PostgresEmailRepository {
	return &PostgresEmailRepository{db: db}
}

func (r *PostgresEmailRepository) Save(ctx context.Context, e *model.Email) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO emails (`+emailColumns+`) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (id) DO UPDATE SET
			status = EXCLUDED.status, error = EXCLUDED.error, sent_at = EXCLUDED.sent_at`,
		e.ID, e.To, e.Subject, e.Body, e.Status, e.Error, e.CreatedAt, database.NullTime(e.SentAt))
	if err != nil {
		return fmt.Errorf("save email: %w", err)
	}
	return nil
}

func (r *PostgresEmailRepository) FindByID(ctx context.Context, id string) (*model.Email, error) {
	e, err := scanEmail(r.db.QueryRow(ctx, `SELECT `+emailColumns+` FROM emails WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrEmailNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find email: %w", err)
	}
	return e, nil
}

// List retorna os emails do mais recente para o mais antigo.
func (r *PostgresEmailRepository) List(ctx context.Context) ([]*model.Email, error) {
	rows, err := r.db.Query(ctx, `SELECT `+emailColumns+` FROM emails ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list emails: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.Email, error) {
		return scanEmail(row)
	})
	if err != nil {
		return nil, fmt.Errorf("list emails: %w", err)
	}
	return out, nil
}

func scanEmail(row pgx.Row) (*model.Email, error) {
	var (
		e      model.Email
		sentAt *time.Time
	)
	if err := row.Scan(&e.ID, &e.To, &e.Subject, &e.Body, &e.Status, &e.Error, &e.CreatedAt, &sentAt); err != nil {
		return nil, err
	}
	e.CreatedAt = e.CreatedAt.UTC()
	e.SentAt = database.TimeOrZero(sentAt)
	return &e, nil
}
