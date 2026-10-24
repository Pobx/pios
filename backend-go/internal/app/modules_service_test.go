package app_test

import (
	"context"
	"errors"
	"testing"

	"github.com/otp2025/backend-go/internal/app"
	"github.com/otp2025/backend-go/internal/domain"
)

type fakeIdentityRepo struct {
	users []domain.UserSummary
	zones []domain.Zone
	err   error
}

func (f *fakeIdentityRepo) ListUsers(_ context.Context, _ *int64, _ string, _, _ int) ([]domain.UserSummary, error) {
	return f.users, f.err
}
func (f *fakeIdentityRepo) ListZones(_ context.Context, _ *int64) ([]domain.Zone, error) {
	return f.zones, f.err
}
func (f *fakeIdentityRepo) LinkUserLineAccount(_ context.Context, _ *int64, userID int64, lineUserID string) (domain.UserSummary, error) {
	if f.err != nil {
		return domain.UserSummary{}, f.err
	}
	return domain.UserSummary{ID: userID, LineUserID: lineUserID}, nil
}

type fakeInventoryRepo struct {
	items []domain.InventoryItem
	txs   []domain.InventoryTransaction
	err   error
}

func (f *fakeInventoryRepo) ListItems(context.Context, *int64) ([]domain.InventoryItem, error) {
	return f.items, f.err
}
func (f *fakeInventoryRepo) ListTransactions(context.Context, *int64) ([]domain.InventoryTransaction, error) {
	return f.txs, f.err
}

type fakeFoodWasteRepo struct {
	summary domain.FoodWasteSummary
	err     error
}

func (f *fakeFoodWasteRepo) GetSummary(context.Context, *int64) (domain.FoodWasteSummary, error) {
	return f.summary, f.err
}

type fakeRecycleRepo struct {
	items []domain.RecycleItem
	err   error
}

func (f *fakeRecycleRepo) ListRecycleItems(context.Context, *int64) ([]domain.RecycleItem, error) {
	return f.items, f.err
}

type fakeTabwaterRepo struct {
	meters   []domain.WaterMeter
	invoices []domain.WaterInvoice
	err      error
}

func (f *fakeTabwaterRepo) ListMeters(context.Context, *int64, int, int) ([]domain.WaterMeter, error) {
	return f.meters, f.err
}
func (f *fakeTabwaterRepo) ListInvoices(context.Context, *int64, string, int, int) ([]domain.WaterInvoice, error) {
	return f.invoices, f.err
}

func TestIdentityService(t *testing.T) {
	adminClaims := domain.Claims{Roles: []string{domain.RoleAdmin}, OrgID: i64(1)}
	userClaims := domain.Claims{Roles: []string{domain.RoleUser}, OrgID: i64(1)}

	svc := app.NewIdentityService(&fakeIdentityRepo{})

	// ListUsers
	if _, err := svc.ListUsers(context.Background(), userClaims, nil, "", 0, -5); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden for user role, got %v", err)
	}
	if _, err := svc.ListUsers(context.Background(), adminClaims, i64(2), "", 500, 0); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden for cross-org access, got %v", err)
	}
	users, err := svc.ListUsers(context.Background(), adminClaims, nil, " somchai ", 500, -1)
	if err != nil || users == nil || len(users) != 0 {
		t.Fatalf("expected empty non-nil slice, got %v, %v", users, err)
	}

	// ListZones
	if _, err := svc.ListZones(context.Background(), userClaims, nil); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden for user role, got %v", err)
	}
	zones, err := svc.ListZones(context.Background(), adminClaims, nil)
	if err != nil || zones == nil {
		t.Fatalf("expected empty non-nil zones, got %v, %v", zones, err)
	}

	// LinkLineAccount
	if _, err := svc.LinkLineAccount(context.Background(), userClaims, nil, domain.LineLinkCommand{}); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
	if _, err := svc.LinkLineAccount(context.Background(), adminClaims, nil, domain.LineLinkCommand{TargetUserID: 0}); !errors.Is(err, domain.ErrBadRequest) {
		t.Fatalf("expected ErrBadRequest, got %v", err)
	}
	linked, err := svc.LinkLineAccount(context.Background(), adminClaims, nil, domain.LineLinkCommand{
		TargetUserID:     42,
		LineUserID:       " Uabcdef123456 ",
		VerificationMode: "staff_code",
		VerificationCode: "OTP-STAFF-001",
	})
	if err != nil || linked.ID != 42 || linked.LineUserID != "Uabcdef123456" {
		t.Fatalf("unexpected link result: %+v, err=%v", linked, err)
	}
}

func TestInventoryService(t *testing.T) {
	adminClaims := domain.Claims{Roles: []string{domain.RoleAdmin}, OrgID: i64(1)}
	userClaims := domain.Claims{Roles: []string{domain.RoleUser}, OrgID: i64(1)}
	svc := app.NewInventoryService(&fakeInventoryRepo{})

	if _, err := svc.ListItems(context.Background(), userClaims, nil); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
	items, err := svc.ListItems(context.Background(), adminClaims, nil)
	if err != nil || items == nil {
		t.Fatalf("unexpected: %v, %v", items, err)
	}

	if _, err := svc.ListTransactions(context.Background(), userClaims, nil); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
	txs, err := svc.ListTransactions(context.Background(), adminClaims, nil)
	if err != nil || txs == nil {
		t.Fatalf("unexpected: %v, %v", txs, err)
	}
}

func TestFoodWasteService(t *testing.T) {
	staffClaims := domain.Claims{Roles: []string{domain.RoleFoodwasteStaff}, OrgID: i64(1)}
	userClaims := domain.Claims{Roles: []string{domain.RoleUser}, OrgID: i64(1)}
	svc := app.NewFoodWasteService(&fakeFoodWasteRepo{})

	if _, err := svc.GetSummary(context.Background(), userClaims, nil); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
	sum, err := svc.GetSummary(context.Background(), staffClaims, nil)
	if err != nil || sum.Batches == nil || sum.EmissionFactors == nil {
		t.Fatalf("unexpected summary: %+v, %v", sum, err)
	}
}

func TestRecycleService(t *testing.T) {
	staffClaims := domain.Claims{Roles: []string{domain.RoleRecycleBankStaff}, OrgID: i64(1)}
	userClaims := domain.Claims{Roles: []string{domain.RoleUser}, OrgID: i64(1)}
	svc := app.NewRecycleService(&fakeRecycleRepo{})

	if _, err := svc.ListItems(context.Background(), userClaims, nil); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
	items, err := svc.ListItems(context.Background(), staffClaims, nil)
	if err != nil || items == nil {
		t.Fatalf("unexpected items: %v, %v", items, err)
	}
}

func TestTabwaterService(t *testing.T) {
	staffClaims := domain.Claims{Roles: []string{domain.RoleTabwaterStaff}, OrgID: i64(1)}
	userClaims := domain.Claims{Roles: []string{domain.RoleUser}, OrgID: i64(1)}
	svc := app.NewTabwaterService(&fakeTabwaterRepo{})

	if _, err := svc.ListMeters(context.Background(), userClaims, nil, 10, 0); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
	meters, err := svc.ListMeters(context.Background(), staffClaims, nil, 0, -1)
	if err != nil || meters == nil {
		t.Fatalf("unexpected meters: %v, %v", meters, err)
	}

	if _, err := svc.ListInvoices(context.Background(), userClaims, nil, "", 10, 0); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
	invs, err := svc.ListInvoices(context.Background(), staffClaims, nil, " owe ", 10, 0)
	if err != nil || invs == nil {
		t.Fatalf("unexpected invoices: %v, %v", invs, err)
	}
}
