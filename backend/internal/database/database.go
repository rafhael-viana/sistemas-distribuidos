package database

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Drivers aceitos em DB_DRIVER.
const (
	DriverMemory   = "memory"
	DriverPostgres = "postgres"
)

const connectTimeout = 10 * time.Second

// Connect abre o banco escolhido em DB_DRIVER. Com "memory" devolve um pool
// nil: o serviço usa os repositórios em memória. Com "postgres" conecta em
// url e cria as tabelas de schema, se ainda não existirem.
func Connect(ctx context.Context, driver, url, schema string) (*pgxpool.Pool, error) {
	switch driver {
	case DriverMemory:
		return nil, nil
	case DriverPostgres:
	default:
		return nil, fmt.Errorf("invalid DB_DRIVER %q: use %q or %q", driver, DriverMemory, DriverPostgres)
	}
	if url == "" {
		return nil, errors.New("DATABASE_URL is required when DB_DRIVER=postgres")
	}

	ctx, cancel := context.WithTimeout(ctx, connectTimeout)
	defer cancel()

	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("connect to database: %w", err)
	}
	if _, err := pool.Exec(ctx, schema); err != nil {
		pool.Close()
		return nil, fmt.Errorf("create schema: %w", err)
	}
	return pool, nil
}

// IsUniqueViolation informa se err veio de uma constraint UNIQUE e qual foi.
func IsUniqueViolation(err error) (constraint string, ok bool) {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return pgErr.ConstraintName, true
	}
	return "", false
}

// NullTime grava o time.Time zero como NULL.
func NullTime(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	return &t
}

// TimeOrZero é o inverso de NullTime, já em UTC.
func TimeOrZero(t *time.Time) time.Time {
	if t == nil {
		return time.Time{}
	}
	return t.UTC()
}
