// Package postgres implements outbound persistence and readiness adapters
// using pgx/v5.
package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/otp2025/backend-go/internal/domain"
)

// DB is the minimal pgxpool surface required by Store.
type DB interface {
	Ping(ctx context.Context) error
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Store implements app.OrganizationRepository and app.HealthChecker.
type Store struct {
	db DB
}

// NewPool parses databaseURL and creates a pgx connection pool.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	return pgxpool.NewWithConfig(ctx, cfg)
}

// NewStore builds a Store backed by db (typically *pgxpool.Pool).
func NewStore(db DB) *Store {
	return &Store{db: db}
}

// Ping checks database connectivity.
func (s *Store) Ping(ctx context.Context) error {
	return s.db.Ping(ctx)
}

const (
	listOrganizationsSQL = `SELECT id, org_code, org_name, org_type_id FROM organizations ORDER BY id`
	getOrganizationSQL   = `SELECT id, org_code, org_name, org_type_id FROM organizations WHERE id = $1`
)

// List returns all organizations ordered by ID.
func (s *Store) List(ctx context.Context) ([]domain.Organization, error) {
	rows, err := s.db.Query(ctx, listOrganizationsSQL)
	if err != nil {
		return nil, fmt.Errorf("query organizations: %w", err)
	}
	defer rows.Close()

	out := []domain.Organization{}
	for rows.Next() {
		var o domain.Organization
		if err := rows.Scan(&o.ID, &o.Code, &o.Name, &o.TypeID); err != nil {
			return nil, fmt.Errorf("scan organization: %w", err)
		}
		out = append(out, o)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate organizations: %w", err)
	}
	return out, nil
}

// GetByID returns a single organization by ID or domain.ErrNotFound.
func (s *Store) GetByID(ctx context.Context, id int64) (domain.Organization, error) {
	var o domain.Organization
	err := s.db.QueryRow(ctx, getOrganizationSQL, id).Scan(&o.ID, &o.Code, &o.Name, &o.TypeID)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Organization{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Organization{}, fmt.Errorf("get organization %d: %w", id, err)
	}
	return o, nil
}
