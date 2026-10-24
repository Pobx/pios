package app_test

import (
	"context"
	"errors"
	"testing"

	"github.com/otp2025/backend-go/internal/app"
	"github.com/otp2025/backend-go/internal/domain"
)

type fakeRepo struct {
	orgs map[int64]domain.Organization
	err  error
}

func (f *fakeRepo) List(context.Context) ([]domain.Organization, error) {
	if f.err != nil {
		return nil, f.err
	}
	out := []domain.Organization{}
	for i := int64(1); i <= 3; i++ {
		if o, ok := f.orgs[i]; ok {
			out = append(out, o)
		}
	}
	return out, nil
}

func (f *fakeRepo) GetByID(_ context.Context, id int64) (domain.Organization, error) {
	if f.err != nil {
		return domain.Organization{}, f.err
	}
	o, ok := f.orgs[id]
	if !ok {
		return domain.Organization{}, domain.ErrNotFound
	}
	return o, nil
}

func i64(v int64) *int64 { return &v }

func TestListOrganizations(t *testing.T) {
	repo := func() *fakeRepo {
		return &fakeRepo{orgs: map[int64]domain.Organization{
			1: {ID: 1, Code: "A", Name: "Org A", TypeID: 1},
			2: {ID: 2, Code: "B", Name: "Org B", TypeID: 1},
		}}
	}
	boom := errors.New("boom")
	tests := []struct {
		name    string
		claims  domain.Claims
		repo    *fakeRepo
		wantIDs []int64
		wantErr error
	}{
		{"super admin sees all", domain.Claims{Roles: []string{"super_admin"}}, repo(), []int64{1, 2}, nil},
		{"admin sees own org", domain.Claims{Roles: []string{"admin"}, OrgID: i64(2)}, repo(), []int64{2}, nil},
		{"admin without org sees none", domain.Claims{Roles: []string{"admin"}}, repo(), []int64{}, nil},
		{"admin with unknown org sees none", domain.Claims{Roles: []string{"admin"}, OrgID: i64(99)}, repo(), []int64{}, nil},
		{"user role forbidden", domain.Claims{Roles: []string{"user"}, OrgID: i64(1)}, repo(), nil, domain.ErrForbidden},
		{"repo error propagates (super)", domain.Claims{Roles: []string{"super_admin"}}, &fakeRepo{err: boom}, nil, boom},
		{"repo error propagates (admin)", domain.Claims{Roles: []string{"admin"}, OrgID: i64(1)}, &fakeRepo{err: boom}, nil, boom},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := app.NewOrganizationService(tt.repo)
			got, err := svc.List(context.Background(), tt.claims)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				return
			}
			if len(got) != len(tt.wantIDs) {
				t.Fatalf("len = %d, want %d", len(got), len(tt.wantIDs))
			}
			for i, id := range tt.wantIDs {
				if got[i].ID != id {
					t.Fatalf("got[%d].ID = %d want %d", i, got[i].ID, id)
				}
			}
		})
	}
}
