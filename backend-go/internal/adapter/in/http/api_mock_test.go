package http_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	httpadapter "github.com/otp2025/backend-go/internal/adapter/in/http"
	"github.com/otp2025/backend-go/internal/app"
	"github.com/otp2025/backend-go/internal/domain"
)

// MockTokenVerifier is a spy/mock implementation of domain.TokenVerifier for API Mock Tests.
type MockTokenVerifier struct {
	mu        sync.Mutex
	VerifyFn  func(ctx context.Context, rawToken string) (domain.Claims, error)
	Calls     []string
}

func (m *MockTokenVerifier) Verify(ctx context.Context, rawToken string) (domain.Claims, error) {
	m.mu.Lock()
	m.Calls = append(m.Calls, rawToken)
	m.mu.Unlock()
	if m.VerifyFn != nil {
		return m.VerifyFn(ctx, rawToken)
	}
	return domain.Claims{}, domain.ErrUnauthorized
}

// MockOrganizationRepository is a spy/mock implementation of domain.OrganizationRepository for API Mock Tests.
type MockOrganizationRepository struct {
	mu          sync.Mutex
	ListFn      func(ctx context.Context) ([]domain.Organization, error)
	GetByIDFn   func(ctx context.Context, id int64) (domain.Organization, error)
	ListCalls   int
	GetByIDArgs []int64
}

func (m *MockOrganizationRepository) List(ctx context.Context) ([]domain.Organization, error) {
	m.mu.Lock()
	m.ListCalls++
	m.mu.Unlock()
	if m.ListFn != nil {
		return m.ListFn(ctx)
	}
	return nil, nil
}

func (m *MockOrganizationRepository) GetByID(ctx context.Context, id int64) (domain.Organization, error) {
	m.mu.Lock()
	m.GetByIDArgs = append(m.GetByIDArgs, id)
	m.mu.Unlock()
	if m.GetByIDFn != nil {
		return m.GetByIDFn(ctx, id)
	}
	return domain.Organization{}, domain.ErrNotFound
}

// MockHealthPinger is a spy/mock implementation of domain.HealthPinger for API Mock Tests.
type MockHealthPinger struct {
	mu        sync.Mutex
	PingFn    func(ctx context.Context) error
	PingCalls int
}

func (m *MockHealthPinger) Ping(ctx context.Context) error {
	m.mu.Lock()
	m.PingCalls++
	m.mu.Unlock()
	if m.PingFn != nil {
		return m.PingFn(ctx)
	}
	return nil
}

func TestAPIMock_AllEndpointsAndInteractions(t *testing.T) {
	t.Run("GET /healthz does not touch DB or TokenVerifier", func(t *testing.T) {
		verifier := &MockTokenVerifier{}
		repo := &MockOrganizationRepository{}
		pinger := &MockHealthPinger{}

		srv := httpadapter.NewServer(httpadapter.Deps{
			Verifier:      verifier,
			Organizations: app.NewOrganizationService(repo),
			Health:        pinger,
		})

		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		if pinger.PingCalls != 0 {
			t.Fatalf("PingCalls = %d, want 0", pinger.PingCalls)
		}
		if len(verifier.Calls) != 0 {
			t.Fatalf("Verifier.Calls = %d, want 0", len(verifier.Calls))
		}
	})

	t.Run("GET /readyz calls HealthPinger once and maps failure to 503 RFC7807", func(t *testing.T) {
		pinger := &MockHealthPinger{
			PingFn: func(context.Context) error {
				return errors.New("connection refused")
			},
		}
		srv := httpadapter.NewServer(httpadapter.Deps{
			Verifier:      &MockTokenVerifier{},
			Organizations: app.NewOrganizationService(&MockOrganizationRepository{}),
			Health:        pinger,
		})

		req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)

		if pinger.PingCalls != 1 {
			t.Fatalf("PingCalls = %d, want 1", pinger.PingCalls)
		}
		p := assertProblem(t, rec, http.StatusServiceUnavailable)
		if p.Instance != "/readyz" {
			t.Fatalf("instance = %q, want /readyz", p.Instance)
		}
	})

	t.Run("GET /api/v1/me verifies bearer token via MockTokenVerifier and never hits OrganizationRepository", func(t *testing.T) {
		orgID := int64(1)
		verifier := &MockTokenVerifier{
			VerifyFn: func(_ context.Context, rawToken string) (domain.Claims, error) {
				if rawToken == "mock-jwt-admin" {
					return domain.Claims{
						Subject:  "user-uuid-001",
						Username: "admin1",
						Roles:    []string{"admin"},
						OrgID:    &orgID,
					}, nil
				}
				return domain.Claims{}, domain.ErrUnauthorized
			},
		}
		repo := &MockOrganizationRepository{}
		srv := httpadapter.NewServer(httpadapter.Deps{
			Verifier:      verifier,
			Organizations: app.NewOrganizationService(repo),
			Health:        &MockHealthPinger{},
		})

		req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
		req.Header.Set("Authorization", "Bearer mock-jwt-admin")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		if len(verifier.Calls) != 1 || verifier.Calls[0] != "mock-jwt-admin" {
			t.Fatalf("unexpected verifier calls: %+v", verifier.Calls)
		}
		if repo.ListCalls != 0 || len(repo.GetByIDArgs) != 0 {
			t.Fatalf("expected 0 repo calls on /me, got List=%d GetByID=%v", repo.ListCalls, repo.GetByIDArgs)
		}
	})

	t.Run("GET /api/v1/organizations with admin calls GetByID(org_id) and never List()", func(t *testing.T) {
		orgID := int64(1)
		verifier := &MockTokenVerifier{
			VerifyFn: func(_ context.Context, _ string) (domain.Claims, error) {
				return domain.Claims{
					Subject:  "sub-admin-1",
					Username: "admin1",
					Roles:    []string{"admin"},
					OrgID:    &orgID,
				}, nil
			},
		}
		repo := &MockOrganizationRepository{
			GetByIDFn: func(_ context.Context, id int64) (domain.Organization, error) {
				return domain.Organization{
					ID:     id,
					Code:   "HSG1",
					Name:   "ห้องแซง",
					TypeID: 1,
				}, nil
			},
		}
		srv := httpadapter.NewServer(httpadapter.Deps{
			Verifier:      verifier,
			Organizations: app.NewOrganizationService(repo),
			Health:        &MockHealthPinger{},
		})

		req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations", nil)
		req.Header.Set("Authorization", "Bearer admin-jwt")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		if repo.ListCalls != 0 {
			t.Fatalf("ListCalls = %d, want 0 for org-scoped admin", repo.ListCalls)
		}
		if len(repo.GetByIDArgs) != 1 || repo.GetByIDArgs[0] != 1 {
			t.Fatalf("GetByIDArgs = %v, want [1]", repo.GetByIDArgs)
		}
	})

	t.Run("GET /api/v1/organizations with admin whose org does not exist returns 200 empty array", func(t *testing.T) {
		missingOrgID := int64(999)
		verifier := &MockTokenVerifier{
			VerifyFn: func(_ context.Context, _ string) (domain.Claims, error) {
				return domain.Claims{
					Subject:  "sub-admin-999",
					Username: "admin999",
					Roles:    []string{"admin"},
					OrgID:    &missingOrgID,
				}, nil
			},
		}
		repo := &MockOrganizationRepository{
			GetByIDFn: func(_ context.Context, _ int64) (domain.Organization, error) {
				return domain.Organization{}, domain.ErrNotFound
			},
		}
		srv := httpadapter.NewServer(httpadapter.Deps{
			Verifier:      verifier,
			Organizations: app.NewOrganizationService(repo),
			Health:        &MockHealthPinger{},
		})

		req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations", nil)
		req.Header.Set("Authorization", "Bearer admin-missing-org")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		var list []any
		if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil || len(list) != 0 {
			t.Fatalf("expected empty JSON array [], got %s", rec.Body.String())
		}
	})

	t.Run("GET /api/v1/organizations with super_admin calls List() once and never GetByID()", func(t *testing.T) {
		verifier := &MockTokenVerifier{
			VerifyFn: func(_ context.Context, _ string) (domain.Claims, error) {
				return domain.Claims{
					Subject:  "sub-super",
					Username: "super1",
					Roles:    []string{"super_admin"},
				}, nil
			},
		}
		repo := &MockOrganizationRepository{
			ListFn: func(context.Context) ([]domain.Organization, error) {
				return []domain.Organization{
					{ID: 1, Code: "HSG1", Name: "ห้องแซง", TypeID: 1},
					{ID: 2, Code: "TNG1", Name: "เต่างอย", TypeID: 5},
					{ID: 3, Code: "KUCSC", Name: "ม.เกษตรฯ สกลนคร", TypeID: 6},
				}, nil
			},
		}
		srv := httpadapter.NewServer(httpadapter.Deps{
			Verifier:      verifier,
			Organizations: app.NewOrganizationService(repo),
			Health:        &MockHealthPinger{},
		})

		req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations", nil)
		req.Header.Set("Authorization", "Bearer super-jwt")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		if repo.ListCalls != 1 || len(repo.GetByIDArgs) != 0 {
			t.Fatalf("expected ListCalls=1 and GetByIDArgs=[], got List=%d GetByID=%v", repo.ListCalls, repo.GetByIDArgs)
		}
		var list []map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil || len(list) != 3 {
			t.Fatalf("unexpected body: %s", rec.Body.String())
		}
	})

	t.Run("GET /api/v1/organizations with forbidden role blocks at middleware without calling repo", func(t *testing.T) {
		orgID := int64(1)
		verifier := &MockTokenVerifier{
			VerifyFn: func(_ context.Context, _ string) (domain.Claims, error) {
				return domain.Claims{
					Subject:  "sub-staff",
					Username: "staff1",
					Roles:    []string{"tabwater_staff"},
					OrgID:    &orgID,
				}, nil
			},
		}
		repo := &MockOrganizationRepository{}
		srv := httpadapter.NewServer(httpadapter.Deps{
			Verifier:      verifier,
			Organizations: app.NewOrganizationService(repo),
			Health:        &MockHealthPinger{},
		})

		req := httptest.NewRequest(http.MethodGet, "/api/v1/organizations", nil)
		req.Header.Set("Authorization", "Bearer staff-jwt")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)

		p := assertProblem(t, rec, http.StatusForbidden)
		if p.Title != "Forbidden" || p.Instance != "/api/v1/organizations" {
			t.Fatalf("unexpected problem: %+v", p)
		}
		if repo.ListCalls != 0 || len(repo.GetByIDArgs) != 0 {
			t.Fatalf("expected 0 repo calls when blocked by RBAC middleware, got List=%d GetByID=%v", repo.ListCalls, repo.GetByIDArgs)
		}
	})
}
