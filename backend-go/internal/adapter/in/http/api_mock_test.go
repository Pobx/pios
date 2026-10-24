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

type mockAllModulesRepo struct {
	users        []domain.UserSummary
	zones        []domain.Zone
	invItems     []domain.InventoryItem
	invTxs       []domain.InventoryTransaction
	fwSummary    domain.FoodWasteSummary
	recycleItems []domain.RecycleItem
	meters       []domain.WaterMeter
	invoices     []domain.WaterInvoice
	err          error
}

func (m *mockAllModulesRepo) ListUsers(context.Context, *int64, string, int, int) ([]domain.UserSummary, error) {
	return m.users, m.err
}
func (m *mockAllModulesRepo) ListZones(context.Context, *int64) ([]domain.Zone, error) {
	return m.zones, m.err
}
func (m *mockAllModulesRepo) LinkUserLineAccount(_ context.Context, orgID *int64, userID int64, lineUserID string) (domain.UserSummary, error) {
	if m.err != nil {
		return domain.UserSummary{}, m.err
	}
	return domain.UserSummary{ID: userID, OrgID: orgID, Username: "linked_user", LineUserID: lineUserID}, nil
}
func (m *mockAllModulesRepo) ListItems(context.Context, *int64) ([]domain.InventoryItem, error) {
	return m.invItems, m.err
}
func (m *mockAllModulesRepo) ListTransactions(context.Context, *int64) ([]domain.InventoryTransaction, error) {
	return m.invTxs, m.err
}
func (m *mockAllModulesRepo) GetSummary(context.Context, *int64) (domain.FoodWasteSummary, error) {
	return m.fwSummary, m.err
}
func (m *mockAllModulesRepo) ListRecycleItems(context.Context, *int64) ([]domain.RecycleItem, error) {
	return m.recycleItems, m.err
}
func (m *mockAllModulesRepo) ListMeters(context.Context, *int64, int, int) ([]domain.WaterMeter, error) {
	return m.meters, m.err
}
func (m *mockAllModulesRepo) ListInvoices(context.Context, *int64, string, int, int) ([]domain.WaterInvoice, error) {
	return m.invoices, m.err
}

func TestAPIMock_WaveModules(t *testing.T) {
	org1 := int64(1)
	verifier := &MockTokenVerifier{
		VerifyFn: func(_ context.Context, rawToken string) (domain.Claims, error) {
			switch rawToken {
			case "admin-tok":
				return domain.Claims{Subject: "sub-admin", Username: "admin1", Roles: []string{domain.RoleAdmin}, OrgID: &org1}, nil
			case "super-tok":
				return domain.Claims{Subject: "sub-super", Username: "super1", Roles: []string{domain.RoleSuperAdmin}}, nil
			case "user-tok":
				return domain.Claims{Subject: "sub-user", Username: "user1", Roles: []string{domain.RoleUser}, OrgID: &org1}, nil
			default:
				return domain.Claims{}, domain.ErrUnauthorized
			}
		},
	}

	mockRepo := &mockAllModulesRepo{
		users:        []domain.UserSummary{{ID: 10, OrgID: &org1, Username: "somchai", FirstName: "สมชาย"}},
		zones:        []domain.Zone{{ID: 1, OrgID: &org1, Name: "หมู่ 1", Subzones: []domain.Subzone{}}},
		invItems:     []domain.InventoryItem{{ID: 1, OrgID: 1, Code: "INV-001", Name: "คลอรีนผง"}},
		invTxs:       []domain.InventoryTransaction{{ID: 1, OrgID: 1, RefNo: "TX-2026-01", Quantity: 5, Status: "approved"}},
		fwSummary:    domain.FoodWasteSummary{TotalBatches: 3, TotalWasteLogs: 12, TotalWeightKg: 45.5, TotalCarbonSavedKg: 18.2},
		recycleItems: []domain.RecycleItem{{ID: 1, OrgID: 1, Code: "KP-01", Name: "ขวดพลาสติกใส PET", PriceForMember: 8.5, Point: 10}},
		meters:       []domain.WaterMeter{{MeterID: 101, OrgID: 1, MeterNumber: "M-0101", SubmeterName: "สมชาย ใจดี", Status: "active"}},
		invoices:     []domain.WaterInvoice{{ID: 5001, InvoiceNo: "INV-5001", OrgID: 1, MeterID: 101, WaterUsed: 15, TotalPaid: 120, Status: "paid"}},
	}

	srv := httpadapter.NewServer(httpadapter.Deps{
		Verifier:      verifier,
		Organizations: app.NewOrganizationService(&MockOrganizationRepository{}),
		Identity:      app.NewIdentityService(mockRepo),
		Inventory:     app.NewInventoryService(mockRepo),
		FoodWaste:     app.NewFoodWasteService(mockRepo),
		Recycle:       app.NewRecycleService(mockRepo),
		Tabwater:      app.NewTabwaterService(mockRepo),
		Health:        &MockHealthPinger{},
	})

	endpoints := []string{
		"/api/v1/users?limit=10&offset=0&q=somchai",
		"/api/v1/zones",
		"/api/v1/inventory/items",
		"/api/v1/inventory/transactions",
		"/api/v1/foodwaste/summary",
		"/api/v1/recycle/items",
		"/api/v1/tabwater/meters?limit=10&offset=0",
		"/api/v1/tabwater/invoices?limit=10&offset=0&status=paid",
	}

	for _, ep := range endpoints {
		t.Run("GET "+ep+" returns 200 for admin and 403 for user role", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, ep, nil)
			req.Header.Set("Authorization", "Bearer admin-tok")
			rec := httptest.NewRecorder()
			srv.ServeHTTP(rec, req)
			if rec.Code != http.StatusOK {
				t.Fatalf("GET %s as admin: status = %d, body = %s", ep, rec.Code, rec.Body.String())
			}

			reqForbidden := httptest.NewRequest(http.MethodGet, ep, nil)
			reqForbidden.Header.Set("Authorization", "Bearer user-tok")
			recForbidden := httptest.NewRecorder()
			srv.ServeHTTP(recForbidden, reqForbidden)
			assertProblem(t, recForbidden, http.StatusForbidden)
		})
	}

	t.Run("Cross-tenant X-Org-Id spoofing by org-scoped admin is blocked with 403 RFC7807", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/tabwater/meters", nil)
		req.Header.Set("Authorization", "Bearer admin-tok")
		req.Header.Set("X-Org-Id", "2")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		assertProblem(t, rec, http.StatusForbidden)
	})

	t.Run("Invalid X-Org-Id header returns 400 Bad Request RFC7807", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
		req.Header.Set("Authorization", "Bearer super-tok")
		req.Header.Set("X-Org-Id", "not-a-number")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		assertProblem(t, rec, http.StatusBadRequest)
	})

	t.Run("POST /api/v1/users/:id/link-line links LINE account with staff verification code", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/users/10/link-line", nil)
		req.Header.Set("Authorization", "Bearer admin-tok")
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		// Empty body -> 400 Bad Request
		srv.ServeHTTP(rec, req)
		assertProblem(t, rec, http.StatusBadRequest)
	})
}
