package domain_test

import (
	"testing"

	"github.com/otp2025/backend-go/internal/domain"
)

func TestClaimsHasRole(t *testing.T) {
	c := domain.Claims{Roles: []string{"admin", "user"}}
	tests := []struct {
		name  string
		roles []string
		want  bool
	}{
		{"match one", []string{"admin"}, true},
		{"match any of", []string{"super_admin", "user"}, true},
		{"no match", []string{"super_admin"}, false},
		{"empty required", nil, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := c.HasAnyRole(tt.roles...); got != tt.want {
				t.Fatalf("got %v want %v", got, tt.want)
			}
		})
	}
}
