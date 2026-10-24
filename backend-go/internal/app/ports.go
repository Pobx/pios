// Package app contains use cases and the ports they depend on.
package app

import (
	"context"

	"github.com/otp2025/backend-go/internal/domain"
)

// OrganizationRepository is the outbound port for organization persistence.
type OrganizationRepository interface {
	List(ctx context.Context) ([]domain.Organization, error)
	// GetByID returns domain.ErrNotFound when no row matches.
	GetByID(ctx context.Context, id int64) (domain.Organization, error)
}

// TokenVerifier validates a raw bearer token and returns its claims.
// Failures must wrap domain.ErrUnauthorized.
type TokenVerifier interface {
	Verify(ctx context.Context, rawToken string) (domain.Claims, error)
}

// HealthChecker reports dependency readiness (e.g. DB ping).
type HealthChecker interface {
	Ping(ctx context.Context) error
}
