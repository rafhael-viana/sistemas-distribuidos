package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rafhael-viana/TCC/internal/audit/model"
)

// Schema cria as tabelas do serviço de auditoria.
const Schema = `
CREATE TABLE IF NOT EXISTS audit_entries (
	event_id    TEXT PRIMARY KEY,
	type        TEXT NOT NULL,
	source      TEXT NOT NULL,
	occurred_at TIMESTAMPTZ NOT NULL,
	data        JSONB NOT NULL,
	recorded_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_entries_type_idx ON audit_entries (type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_entries_occurred_at_idx ON audit_entries (occurred_at DESC);
`

type PostgresEntryRepository struct {
	db *pgxpool.Pool
}

func NewPostgresEntryRepository(db *pgxpool.Pool) *PostgresEntryRepository {
	return &PostgresEntryRepository{db: db}
}

// Save é idempotente: um evento entregue de novo pelo Kafka não é duplicado.
func (r *PostgresEntryRepository) Save(ctx context.Context, e *model.Entry) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO audit_entries (event_id, type, source, occurred_at, data, recorded_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (event_id) DO NOTHING`,
		e.EventID, e.Type, e.Source, e.OccurredAt, []byte(e.Data), e.RecordedAt)
	if err != nil {
		return fmt.Errorf("save audit entry: %w", err)
	}
	return nil
}

// List retorna os registros do evento mais recente para o mais antigo.
func (r *PostgresEntryRepository) List(ctx context.Context, f Filter) ([]*model.Entry, error) {
	rows, err := r.db.Query(ctx,
		`SELECT event_id, type, source, occurred_at, data, recorded_at FROM audit_entries
		 WHERE $1 = '' OR type = $1
		 ORDER BY occurred_at DESC`, f.Type)
	if err != nil {
		return nil, fmt.Errorf("list audit entries: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.Entry, error) {
		var e model.Entry
		if err := row.Scan(&e.EventID, &e.Type, &e.Source, &e.OccurredAt, &e.Data, &e.RecordedAt); err != nil {
			return nil, err
		}
		e.OccurredAt = e.OccurredAt.UTC()
		e.RecordedAt = e.RecordedAt.UTC()
		return &e, nil
	})
	if err != nil {
		return nil, fmt.Errorf("list audit entries: %w", err)
	}
	return out, nil
}
