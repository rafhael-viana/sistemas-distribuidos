package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rafhael-viana/TCC/internal/audit/model"
)

// Schema cria as tabelas do serviço de auditoria. Os ALTER TABLE atualizam
// bancos criados por versões anteriores.
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
ALTER TABLE audit_entries ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE audit_entries ADD COLUMN IF NOT EXISTS correlation_id TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS tech_logs (
	id          TEXT PRIMARY KEY,
	request_id  TEXT NOT NULL,
	service     TEXT NOT NULL,
	level       TEXT NOT NULL,
	kind        TEXT NOT NULL,
	message     TEXT NOT NULL,
	method      TEXT NOT NULL DEFAULT '',
	path        TEXT NOT NULL DEFAULT '',
	status      INTEGER NOT NULL DEFAULT 0,
	duration_ms BIGINT NOT NULL DEFAULT 0,
	user_id     TEXT NOT NULL DEFAULT '',
	error       TEXT NOT NULL DEFAULT '',
	stack       TEXT NOT NULL DEFAULT '',
	occurred_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS tech_logs_occurred_at_idx ON tech_logs (occurred_at DESC);
CREATE INDEX IF NOT EXISTS tech_logs_request_id_idx ON tech_logs (request_id);
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
		`INSERT INTO audit_entries (event_id, type, source, tenant_id, correlation_id, occurred_at, data, recorded_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (event_id) DO NOTHING`,
		e.EventID, e.Type, e.Source, e.TenantID, e.CorrelationID, e.OccurredAt, []byte(e.Data), e.RecordedAt)
	if err != nil {
		return fmt.Errorf("save audit entry: %w", err)
	}
	return nil
}

// List retorna os registros do evento mais recente para o mais antigo.
func (r *PostgresEntryRepository) List(ctx context.Context, f Filter) ([]*model.Entry, error) {
	rows, err := r.db.Query(ctx,
		`SELECT event_id, type, source, tenant_id, correlation_id, occurred_at, data, recorded_at FROM audit_entries
		 WHERE ($1 = '' OR type = $1) AND ($2 = '' OR tenant_id = $2)
		 ORDER BY occurred_at DESC`, f.Type, f.TenantID)
	if err != nil {
		return nil, fmt.Errorf("list audit entries: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.Entry, error) {
		var e model.Entry
		if err := row.Scan(&e.EventID, &e.Type, &e.Source, &e.TenantID, &e.CorrelationID,
			&e.OccurredAt, &e.Data, &e.RecordedAt); err != nil {
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

const logColumns = `id, request_id, service, level, kind, message, method, path, status, duration_ms, user_id, error, stack, occurred_at`

type PostgresLogRepository struct {
	db *pgxpool.Pool
}

func NewPostgresLogRepository(db *pgxpool.Pool) *PostgresLogRepository {
	return &PostgresLogRepository{db: db}
}

func (r *PostgresLogRepository) Save(ctx context.Context, e *model.LogEntry) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO tech_logs (`+logColumns+`) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		 ON CONFLICT (id) DO NOTHING`,
		e.ID, e.RequestID, e.Service, e.Level, e.Kind, e.Message, e.Method, e.Path, e.Status, e.DurationMS,
		e.UserID, e.Error, e.Stack, e.OccurredAt)
	if err != nil {
		return fmt.Errorf("save log: %w", err)
	}
	return nil
}

// logWhere monta o filtro comum; $1..$4 são serviço, desde, busca e níveis.
const logWhere = `($1 = '' OR service = $1) AND ($2::timestamptz IS NULL OR occurred_at >= $2)
	AND ($3 = '' OR message ILIKE '%' || $3 || '%' OR path ILIKE '%' || $3 || '%' OR error ILIKE '%' || $3 || '%'
		OR request_id ILIKE '%' || $3 || '%' OR user_id ILIKE '%' || $3 || '%')`

func (r *PostgresLogRepository) List(ctx context.Context, f LogFilter) (*LogPage, error) {
	var since any
	if !f.Since.IsZero() {
		since = f.Since
	}
	page := &LogPage{Items: []*model.LogEntry{}, Counts: map[string]int{}}

	rows, err := r.db.Query(ctx, `SELECT level, count(*) FROM tech_logs WHERE `+logWhere+` GROUP BY level`,
		f.Service, since, f.Query)
	if err != nil {
		return nil, fmt.Errorf("count logs: %w", err)
	}
	for rows.Next() {
		var (
			level string
			n     int
		)
		if err := rows.Scan(&level, &n); err != nil {
			rows.Close()
			return nil, fmt.Errorf("count logs: %w", err)
		}
		page.Counts[level] = n
		if len(f.Levels) == 0 || contains(f.Levels, level) {
			page.Total += n
		}
	}
	rows.Close()

	rows, err = r.db.Query(ctx,
		`SELECT `+logColumns+` FROM tech_logs WHERE `+logWhere+` AND (cardinality($4::text[]) = 0 OR level = ANY($4))
		 ORDER BY occurred_at DESC LIMIT $5 OFFSET $6`,
		f.Service, since, f.Query, f.Levels, f.Limit, f.Offset)
	if err != nil {
		return nil, fmt.Errorf("list logs: %w", err)
	}
	items, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.LogEntry, error) { return scanLog(row) })
	if err != nil {
		return nil, fmt.Errorf("list logs: %w", err)
	}
	page.Items = items
	return page, nil
}

func (r *PostgresLogRepository) Trace(ctx context.Context, requestID string) ([]*model.LogEntry, error) {
	rows, err := r.db.Query(ctx, `SELECT `+logColumns+` FROM tech_logs WHERE request_id = $1 ORDER BY occurred_at`, requestID)
	if err != nil {
		return nil, fmt.Errorf("trace logs: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*model.LogEntry, error) { return scanLog(row) })
	if err != nil {
		return nil, fmt.Errorf("trace logs: %w", err)
	}
	return out, nil
}

func scanLog(row pgx.Row) (*model.LogEntry, error) {
	var e model.LogEntry
	err := row.Scan(&e.ID, &e.RequestID, &e.Service, &e.Level, &e.Kind, &e.Message, &e.Method, &e.Path,
		&e.Status, &e.DurationMS, &e.UserID, &e.Error, &e.Stack, &e.OccurredAt)
	if err != nil {
		return nil, err
	}
	e.OccurredAt = e.OccurredAt.UTC()
	return &e, nil
}

func contains(list []string, s string) bool {
	for _, item := range list {
		if item == s {
			return true
		}
	}
	return false
}
