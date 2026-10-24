package app

import (
	"context"
	"errors"

	"github.com/otp2025/backend-go/internal/domain"
)

// OrganizationService implements organization queries with tenant scoping.
type OrganizationService struct {
	repo OrganizationRepository
}

// NewOrganizationService builds the service.
func NewOrganizationService(repo OrganizationRepository) *OrganizationService {
	return &OrganizationService{repo: repo}
}

// List returns all organizations for super_admin, only the caller's own
// organization for admin, and domain.ErrForbidden for anyone else.
func (s *OrganizationService) List(ctx context.Context, c domain.Claims) ([]domain.Organization, error) {
	switch {
	case c.HasAnyRole(domain.RoleSuperAdmin):
		return s.repo.List(ctx)
	case c.HasAnyRole(domain.RoleAdmin):
		if c.OrgID == nil {
			return []domain.Organization{}, nil
		}
		o, err := s.repo.GetByID(ctx, *c.OrgID)
		if errors.Is(err, domain.ErrNotFound) {
			return []domain.Organization{}, nil
		}
		if err != nil {
			return nil, err
		}
		return []domain.Organization{o}, nil
	default:
		return nil, domain.ErrForbidden
	}
}
