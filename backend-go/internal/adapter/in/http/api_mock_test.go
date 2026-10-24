package http_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
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
func (m *mockAllModulesRepo) GetResidentOverview(_ context.Context, orgID *int64, username string) (domain.ResidentOverview, error) {
	if m.err != nil {
		return domain.ResidentOverview{}, m.err
	}
	return domain.ResidentOverview{Username: username, OrgID: orgID, WaterMeters: m.meters, Invoices: m.invoices}, nil
}
func (m *mockAllModulesRepo) CreateUser(_ context.Context, orgID int64, cmd domain.CreateUserCommand) (domain.UserSummary, error) {
	return domain.UserSummary{ID: 777, OrgID: &orgID, Username: cmd.Username, FirstName: cmd.FirstName, Status: "active"}, m.err
}
func (m *mockAllModulesRepo) CreateZone(_ context.Context, orgID int64, cmd domain.CreateZoneCommand) (domain.Zone, error) {
	return domain.Zone{ID: 88, OrgID: &orgID, Name: cmd.ZoneName, Status: "active"}, m.err
}
func (m *mockAllModulesRepo) ListItems(context.Context, *int64) ([]domain.InventoryItem, error) {
	return m.invItems, m.err
}
func (m *mockAllModulesRepo) ListTransactions(context.Context, *int64) ([]domain.InventoryTransaction, error) {
	return m.invTxs, m.err
}
func (m *mockAllModulesRepo) CreateItem(_ context.Context, orgID int64, cmd domain.CreateInventoryItemCommand) (domain.InventoryItem, error) {
	return domain.InventoryItem{ID: 99, OrgID: orgID, Code: cmd.Code, Name: cmd.Name}, m.err
}
func (m *mockAllModulesRepo) CreateTransaction(_ context.Context, orgID int64, cmd domain.CreateInventoryTransactionCommand) (domain.InventoryTransaction, error) {
	return domain.InventoryTransaction{ID: 88, OrgID: orgID, RefNo: cmd.RefNo, ItemID: cmd.ItemID, Quantity: cmd.Quantity, Status: "PENDING"}, m.err
}
func (m *mockAllModulesRepo) DecideTransaction(_ context.Context, _ *int64, cmd domain.TransactionDecisionCommand) (domain.InventoryTransaction, error) {
	return domain.InventoryTransaction{ID: cmd.TransactionID, Status: cmd.Decision}, m.err
}
func (m *mockAllModulesRepo) GetSummary(context.Context, *int64) (domain.FoodWasteSummary, error) {
	return m.fwSummary, m.err
}
func (m *mockAllModulesRepo) CreateCompostBatch(_ context.Context, cmd domain.CreateCompostBatchCommand) (domain.CompostBatch, error) {
	return domain.CompostBatch{ID: 77, UserID: cmd.UserID, BatchCode: cmd.BatchCode, Status: "filling"}, m.err
}
func (m *mockAllModulesRepo) CreateWasteLog(_ context.Context, cmd domain.CreateWasteLogCommand) (domain.WasteLogEntry, error) {
	return domain.WasteLogEntry{ID: 66, UserID: cmd.UserID, WeightKg: cmd.WeightKg, Moisture: cmd.Moisture, CarbonSavedKg: cmd.ComputedCarbonSavedKg()}, m.err
}
func (m *mockAllModulesRepo) ListRecycleItems(context.Context, *int64) ([]domain.RecycleItem, error) {
	return m.recycleItems, m.err
}
func (m *mockAllModulesRepo) ListBankAccounts(context.Context, *int64) ([]domain.BankAccountSummary, error) {
	return []domain.BankAccountSummary{{ID: 1, OrgID: 1, UserID: 1, AccountNo: "ACC-01", Balance: 100, Points: 50, Status: "active"}}, m.err
}
func (m *mockAllModulesRepo) RecordPurchase(_ context.Context, orgID int64, cmd domain.RecordRecyclePurchaseCommand) (domain.RecyclePurchaseTransaction, error) {
	return domain.RecyclePurchaseTransaction{ID: 55, OrgID: orgID, TransNo: cmd.TransNo, UserID: cmd.UserID, TotalWeight: cmd.TotalWeight, TotalAmount: cmd.TotalAmount, TotalPoints: cmd.TotalPoints, Status: "completed"}, m.err
}
func (m *mockAllModulesRepo) GetSubmodulesOverview(context.Context, *int64) (domain.RecycleSubmodulesOverview, error) {
	return domain.RecycleSubmodulesOverview{
		Kiosks:         []domain.KioskSummary{{ID: 1, OrgID: 1, Name: "Kiosk-HSG1", Status: "active", TotalWasteCount: 42}},
		WelfareConfigs: []domain.WelfareConfig{{ID: 1, OrgID: 1, DefaultPayoutAmount: 5000}},
	}, m.err
}
func (m *mockAllModulesRepo) IngestKioskTelemetry(_ context.Context, _ *int64, cmd domain.KioskIngestCommand) (domain.KioskSummary, error) {
	return domain.KioskSummary{ID: cmd.KioskID, OrgID: 1, Name: "Kiosk-HSG1", Status: cmd.Status, TotalWasteCount: 42 + cmd.WasteCountDelta}, m.err
}
func (m *mockAllModulesRepo) WithdrawMemberBalance(_ context.Context, orgID int64, cmd domain.CreateRecycleWithdrawalCommand) (domain.BankAccountSummary, error) {
	return domain.BankAccountSummary{ID: cmd.AccountID, OrgID: orgID, Balance: 50, Status: "active"}, m.err
}
func (m *mockAllModulesRepo) SetRecycleItemPrice(_ context.Context, orgID int64, cmd domain.SetRecycleItemPriceCommand) (domain.RecycleItem, error) {
	return domain.RecycleItem{ID: cmd.ItemID, OrgID: orgID, PriceFromDealer: cmd.PriceFromDealer, PriceForMember: cmd.PriceForMember, Point: cmd.Point}, m.err
}
func (m *mockAllModulesRepo) ListMeters(context.Context, *int64, int, int) ([]domain.WaterMeter, error) {
	return m.meters, m.err
}
func (m *mockAllModulesRepo) ListInvoices(context.Context, *int64, string, int, int) ([]domain.WaterInvoice, error) {
	return m.invoices, m.err
}
func (m *mockAllModulesRepo) RecordMeterReading(_ context.Context, orgID int64, cmd domain.RecordMeterReadingCommand) (domain.WaterInvoice, error) {
	return domain.WaterInvoice{ID: 44, InvoiceNo: cmd.InvoiceNo, OrgID: orgID, MeterID: cmd.MeterID, PeriodID: cmd.PeriodID, CurrentMeter: cmd.CurrentMeter, Status: "invoice"}, m.err
}
func (m *mockAllModulesRepo) PayInvoice(_ context.Context, _ *int64, cmd domain.PayWaterInvoiceCommand) (domain.WaterInvoice, error) {
	return domain.WaterInvoice{ID: cmd.InvoiceID, Status: "paid"}, m.err
}
func (m *mockAllModulesRepo) ListPeriods(context.Context, *int64) ([]domain.InvoicePeriod, error) {
	return []domain.InvoicePeriod{{ID: 1, OrgID: 1, PeriodName: "ตุลาคม 2569", Status: "active"}}, m.err
}
func (m *mockAllModulesRepo) CreatePeriod(_ context.Context, orgID int64, cmd domain.CreateInvoicePeriodCommand) (domain.InvoicePeriod, error) {
	return domain.InvoicePeriod{ID: 2, OrgID: orgID, PeriodName: cmd.PeriodName, Status: "active"}, m.err
}
func (m *mockAllModulesRepo) CreateMeter(_ context.Context, orgID int64, cmd domain.CreateWaterMeterCommand) (domain.WaterMeter, error) {
	return domain.WaterMeter{MeterID: 999, OrgID: orgID, UserID: cmd.UserID, MeterNumber: cmd.MeterNumber, Status: "active"}, m.err
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
		"/api/v1/recycle/submodules",
		"/api/v1/tabwater/periods",
		"/api/v1/tabwater/meters?limit=10&offset=0",
		"/api/v1/tabwater/invoices?limit=10&offset=0&status=paid",
		"/api/v1/reports/tabwater-invoices.csv?limit=10&offset=0",
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

	t.Run("GET /api/v1/resident/overview succeeds for role user", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/resident/overview", nil)
		req.Header.Set("Authorization", "Bearer user-tok")
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("POST write endpoints across Waves 2 to 5 succeed for admin and return 403 for user", func(t *testing.T) {
		postCases := []struct {
			path       string
			payload    string
			wantStatus int
		}{
			{"/api/v1/users", `{"username":"new_resident","firstname":"มานี","lastname":"ใจดี"}`, http.StatusCreated},
			{"/api/v1/zones", `{"zone_name":"หมู่ 15 บ้านใหม่","location":"ต.ห้องแซง"}`, http.StatusCreated},
			{"/api/v1/inventory/items", `{"code":"INV-99","name":"ท่อ PVC","unit":"เส้น","min_stock":5}`, http.StatusCreated},
			{"/api/v1/inventory/transactions", `{"ref_no":"REQ-99","item_id":1,"requester_id":1,"quantity":2,"purpose":"ซ่อมท่อ"}`, http.StatusCreated},
			{"/api/v1/inventory/transactions/10/decision", `{"decision":"APPROVED","comment":"อนุมัติ"}`, http.StatusOK},
			{"/api/v1/foodwaste/batches", `{"user_id":1,"batch_code":"FW-99","start_date":"2026-10-24"}`, http.StatusCreated},
			{"/api/v1/foodwaste/logs", `{"user_id":1,"weight_kg":4.0,"moisture":"good"}`, http.StatusCreated},
			{"/api/v1/recycle/purchases", `{"trans_no":"KP-TX-99","user_id":1,"total_weight":5.5,"total_amount":45,"total_points":20}`, http.StatusCreated},
			{"/api/v1/recycle/withdrawals", `{"account_id":1,"amount":20,"payout_method":"cash","note":"ถอนเงินสด"}`, http.StatusOK},
			{"/api/v1/recycle/items/1/price", `{"price_from_dealer":12,"price_for_member":10,"point":20}`, http.StatusOK},
			{"/api/v1/kiosks/1/ingest", `{"waste_count_delta":3,"status":"active"}`, http.StatusOK},
			{"/api/v1/tabwater/periods", `{"period_name":"พฤศจิกายน 2569","start_date":"2026-11-01","end_date":"2026-11-30"}`, http.StatusCreated},
			{"/api/v1/tabwater/meters", `{"user_id":1,"meternumber":"TW-NEW-01","submeter_name":"มานี ใจดี","meter_address":"99 หมู่ 1","initial_reading":0}`, http.StatusCreated},
			{"/api/v1/tabwater/readings", `{"inv_no":"INV-99","meter_id":1,"period_id":1,"current_meter":150,"reserve_fee":10,"vat_percent":7}`, http.StatusCreated},
			{"/api/v1/tabwater/invoices/5001/pay", `{"cashier_id":1}`, http.StatusOK},
		}

		for _, pc := range postCases {
			req := httptest.NewRequest(http.MethodPost, pc.path, strings.NewReader(pc.payload))
			req.Header.Set("Authorization", "Bearer admin-tok")
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			srv.ServeHTTP(rec, req)
			if rec.Code != pc.wantStatus {
				t.Fatalf("POST %s: status = %d, want %d (body: %s)", pc.path, rec.Code, pc.wantStatus, rec.Body.String())
			}

			reqForbidden := httptest.NewRequest(http.MethodPost, pc.path, strings.NewReader(pc.payload))
			reqForbidden.Header.Set("Authorization", "Bearer user-tok")
			reqForbidden.Header.Set("Content-Type", "application/json")
			recForbidden := httptest.NewRecorder()
			srv.ServeHTTP(recForbidden, reqForbidden)
			assertProblem(t, recForbidden, http.StatusForbidden)
		}
	})

	t.Run("POST /api/v1/kiosks/:id/ingest enforces Idempotency-Key replay and POST /api/v1/webhooks/line verifies X-Line-Signature", func(t *testing.T) {
		req1 := httptest.NewRequest(http.MethodPost, "/api/v1/kiosks/1/ingest", strings.NewReader(`{"waste_count_delta":5,"status":"active"}`))
		req1.Header.Set("Authorization", "Bearer admin-tok")
		req1.Header.Set("Content-Type", "application/json")
		req1.Header.Set("Idempotency-Key", "idem-kiosk-001")
		rec1 := httptest.NewRecorder()
		srv.ServeHTTP(rec1, req1)
		if rec1.Code != http.StatusOK {
			t.Fatalf("first ingest status = %d", rec1.Code)
		}

		req2 := httptest.NewRequest(http.MethodPost, "/api/v1/kiosks/1/ingest", strings.NewReader(`{"waste_count_delta":999,"status":"offline"}`))
		req2.Header.Set("Authorization", "Bearer admin-tok")
		req2.Header.Set("Content-Type", "application/json")
		req2.Header.Set("Idempotency-Key", "idem-kiosk-001")
		rec2 := httptest.NewRecorder()
		srv.ServeHTTP(rec2, req2)
		if rec2.Code != http.StatusOK || rec2.Header().Get("X-Idempotent-Replay") != "true" {
			t.Fatalf("expected X-Idempotent-Replay=true, got status=%d header=%q", rec2.Code, rec2.Header().Get("X-Idempotent-Replay"))
		}

		// LINE Webhook without signature -> 401 RFC7807
		reqLineBad := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/line", strings.NewReader(`{"events":[]}`))
		recLineBad := httptest.NewRecorder()
		srv.ServeHTTP(recLineBad, reqLineBad)
		assertProblem(t, recLineBad, http.StatusUnauthorized)
	})
}
