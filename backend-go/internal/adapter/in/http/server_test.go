package http_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	httpadapter "github.com/otp2025/backend-go/internal/adapter/in/http"
	"github.com/otp2025/backend-go/internal/app"
	"github.com/otp2025/backend-go/internal/domain"
	"github.com/otp2025/backend-go/pkg/problem"
)

type fakeVerifier struct {
	tokens map[string]domain.Claims
}

func (f *fakeVerifier) Verify(_ context.Context, raw string) (domain.Claims, error) {
	c, ok := f.tokens[raw]
	if !ok {
		return domain.Claims{}, domain.ErrUnauthorized
	}
	return c, nil
}

type fakeOrgRepo struct {
	orgs map[int64]domain.Organization
	err  error
}

func (f *fakeOrgRepo) List(context.Context) ([]domain.Organization, error) {
	if f.err != nil {
		return nil, f.err
	}
	out := []domain.Organization{}
	for _, id := range []int64{1, 2} {
		if o, ok := f.orgs[id]; ok {
			out = append(out, o)
		}
	}
	return out, nil
}

func (f *fakeOrgRepo) GetByID(_ context.Context, id int64) (domain.Organization, error) {
	if f.err != nil {
		return domain.Organization{}, f.err
	}
	o, ok := f.orgs[id]
	if !ok {
		return domain.Organization{}, domain.ErrNotFound
	}
	return o, nil
}

type fakeHealth struct {
	err error
}

func (f *fakeHealth) Ping(context.Context) error { return f.err }

func i64(v int64) *int64 { return &v }

func newTestServer(repo *fakeOrgRepo, health *fakeHealth) http.Handler {
	verifier := &fakeVerifier{
		tokens: map[string]domain.Claims{
			"super-token": {
				Subject:  "sub-super",
				Username: "super1",
				Roles:    []string{"super_admin"},
				OrgID:    nil,
			},
			"admin-token": {
				Subject:  "sub-admin",
				Username: "admin1",
				Roles:    []string{"admin", "user"},
				OrgID:    i64(1),
			},
			"user-token": {
				Subject:  "sub-user",
				Username: "user1",
				Roles:    []string{"user"},
				OrgID:    i64(1),
			},
			"noroles-token": {
				Subject:  "sub-none",
				Username: "none1",
				Roles:    nil,
				OrgID:    nil,
			},
		},
	}
	if repo == nil {
		repo = &fakeOrgRepo{
			orgs: map[int64]domain.Organization{
				1: {ID: 1, Code: "HSG1", Name: "Houey Sai", TypeID: 2},
				2: {ID: 2, Code: "TNG1", Name: "Tha Ngon", TypeID: 1},
			},
		}
	}
	if health == nil {
		health = &fakeHealth{}
	}
	return httpadapter.NewServer(httpadapter.Deps{
		Verifier:           verifier,
		Organizations:      app.NewOrganizationService(repo),
		Health:             health,
		CORSAllowedOrigins: []string{"http://localhost"},
	})
}

func assertProblem(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int) problem.Problem {
	t.Helper()
	if rec.Code != wantStatus {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, wantStatus, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != problem.ContentType {
		t.Fatalf("content-type = %q, want %q", ct, problem.ContentType)
	}
	var p problem.Problem
	if err := json.Unmarshal(rec.Body.Bytes(), &p); err != nil {
		t.Fatalf("unmarshal problem: %v", err)
	}
	if p.Status != wantStatus {
		t.Fatalf("problem.Status = %d, want %d", p.Status, wantStatus)
	}
	return p
}

func TestHealthzAndReadyz(t *testing.T) {
	srv := newTestServer(nil, &fakeHealth{})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("healthz status = %d", rec.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body["status"] != "ok" {
		t.Fatalf("unexpected healthz body: %s", rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("readyz status = %d", rec.Code)
	}

	unhealthy := newTestServer(nil, &fakeHealth{err: errors.New("db down")})
	req = httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec = httptest.NewRecorder()
	unhealthy.ServeHTTP(rec, req)
	assertProblem(t, rec, http.StatusServiceUnavailable)
}

func TestMeEndpoint(t *testing.T) {
	srv := newTestServer(nil, nil)

	for _, tc := range []struct {
		name string
		auth string
	}{
		{"missing header", ""},
		{"wrong scheme", "Basic dXNlcjpwYXNz"},
		{"empty bearer", "Bearer   "},
		{"invalid token", "Bearer bad-token"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
			if tc.auth != "" {
				req.Header.Set("Authorization", tc.auth)
			}
			rec := httptest.NewRecorder()
			srv.ServeHTTP(rec, req)
			assertProblem(t, rec, http.StatusUnauthorized)
		})
	}

	t.Run("admin token returns org_id and roles", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
		req.Header.Set("Authorization", "Bearer admin-token")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d", rec.Code)
		}
		var got struct {
			Sub      string   `json:"sub"`
			Username string   `json:"username"`
			Roles    []string `json:"roles"`
			OrgID    *int64   `json:"org_id"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
			t.Fatal(err)
		}
		if got.Sub != "sub-admin" || got.Username != "admin1" || len(got.Roles) != 2 || got.OrgID == nil || *got.OrgID != 1 {
			t.Fatalf("unexpected me response: %+v", got)
		}
	})

	t.Run("super token returns null org_id and non-null empty roles slice when nil", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
		req.Header.Set("Authorization", "Bearer noroles-token")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d", rec.Code)
		}
		var raw map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
			t.Fatal(err)
		}
		if raw["org_id"] != nil {
			t.Fatalf("expected null org_id, got %v", raw["org_id"])
		}
		if roles, ok := raw["roles"].([]any); !ok || len(roles) != 0 {
			t.Fatalf("expected empty roles array, got %v", raw["roles"])
		}
	})
}

func TestOrganizationsEndpoint(t *testing.T) {
	srv := newTestServer(nil, nil)

	t.Run("unauthenticated -> 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations", nil)
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		assertProblem(t, rec, http.StatusUnauthorized)
	})

	t.Run("user role -> 403", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations", nil)
		req.Header.Set("Authorization", "Bearer user-token")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		assertProblem(t, rec, http.StatusForbidden)
	})

	t.Run("admin sees own org only", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations", nil)
		req.Header.Set("Authorization", "Bearer admin-token")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
		}
		var got []struct {
			ID     int64  `json:"id"`
			Code   string `json:"code"`
			Name   string `json:"name"`
			TypeID int64  `json:"type_id"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
			t.Fatal(err)
		}
		if len(got) != 1 || got[0].ID != 1 || got[0].Code != "HSG1" || got[0].Name != "Houey Sai" || got[0].TypeID != 2 {
			t.Fatalf("unexpected orgs: %+v", got)
		}
	})

	t.Run("super_admin sees all orgs", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations", nil)
		req.Header.Set("Authorization", "Bearer super-token")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d", rec.Code)
		}
		var got []map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
			t.Fatal(err)
		}
		if len(got) != 2 {
			t.Fatalf("len = %d, want 2", len(got))
		}
	})

	t.Run("repo failure -> 500 problem+json", func(t *testing.T) {
		failing := newTestServer(&fakeOrgRepo{err: errors.New("boom")}, nil)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations", nil)
		req.Header.Set("Authorization", "Bearer super-token")
		rec := httptest.NewRecorder()
		failing.ServeHTTP(rec, req)
		assertProblem(t, rec, http.StatusInternalServerError)
	})
}

func TestCORSHeaders(t *testing.T) {
	srv := newTestServer(nil, nil)
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/me", nil)
	req.Header.Set("Origin", "http://localhost")
	req.Header.Set("Access-Control-Request-Method", "GET")
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost" {
		t.Fatalf("allow-origin = %q, want http://localhost", got)
	}
}
