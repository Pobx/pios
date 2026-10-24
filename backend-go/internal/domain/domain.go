// Package domain holds the core business types, free of any framework or I/O.
package domain

import "errors"

// Domain errors, mapped to HTTP statuses by inbound adapters.
var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrNotFound     = errors.New("not found")
)

// Role names (Keycloak realm roles).
const (
	RoleSuperAdmin = "super_admin"
	RoleAdmin      = "admin"
)

// Organization is a tenant of the shared schema.
type Organization struct {
	ID     int64
	Code   string
	Name   string
	TypeID int64
}

// Claims is the authenticated principal extracted from an access token.
type Claims struct {
	Subject  string
	Username string
	Roles    []string
	OrgID    *int64 // nil when the token carries no org_id
}

// HasAnyRole reports whether the principal holds at least one of roles.
func (c Claims) HasAnyRole(roles ...string) bool {
	for _, want := range roles {
		for _, have := range c.Roles {
			if have == want {
				return true
			}
		}
	}
	return false
}
