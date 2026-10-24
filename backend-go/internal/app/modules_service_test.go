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
func (f *fakeIdentityRepo) GetResidentOverview(_ context.Context, orgID *int64, username string) (domain.ResidentOverview, error) {
	if f.err != nil {
		return domain.ResidentOverview{}, f.err
	}
	return domain.ResidentOverview{Username: username, OrgID: orgID}, nil
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
func (f *fakeInventoryRepo) CreateItem(_ context.Context, orgID int64, cmd domain.CreateInventoryItemCommand) (domain.InventoryItem, error) {
	if f.err != nil {
		return domain.InventoryItem{}, f.err
	}
	return domain.InventoryItem{ID: 1, OrgID: orgID, Code: cmd.Code, Name: cmd.Name}, nil
}
func (f *fakeInventoryRepo) CreateTransaction(_ context.Context, orgID int64, cmd domain.CreateInventoryTransactionCommand) (domain.InventoryTransaction, error) {
	if f.err != nil {
		return domain.InventoryTransaction{}, f.err
	}
	return domain.InventoryTransaction{ID: 10, OrgID: orgID, RefNo: cmd.RefNo, ItemID: cmd.ItemID, Quantity: cmd.Quantity, Status: "PENDING"}, nil
}
func (f *fakeInventoryRepo) DecideTransaction(_ context.Context, _ *int64, cmd domain.TransactionDecisionCommand) (domain.InventoryTransaction, error) {
	if f.err != nil {
		return domain.InventoryTransaction{}, f.err
	}
	return domain.InventoryTransaction{ID: cmd.TransactionID, Status: cmd.Decision}, nil
}

type fakeFoodWasteRepo struct {
	summary domain.FoodWasteSummary
	err     error
}

func (f *fakeFoodWasteRepo) GetSummary(context.Context, *int64) (domain.FoodWasteSummary, error) {
	return f.summary, f.err
}
func (f *fakeFoodWasteRepo) CreateCompostBatch(_ context.Context, cmd domain.CreateCompostBatchCommand) (domain.CompostBatch, error) {
	if f.err != nil {
		return domain.CompostBatch{}, f.err
	}
	return domain.CompostBatch{ID: 1, UserID: cmd.UserID, BatchCode: cmd.BatchCode, Status: "filling"}, nil
}
func (f *fakeFoodWasteRepo) CreateWasteLog(_ context.Context, cmd domain.CreateWasteLogCommand) (domain.WasteLogEntry, error) {
	if f.err != nil {
		return domain.WasteLogEntry{}, f.err
	}
	return domain.WasteLogEntry{ID: 1, UserID: cmd.UserID, WeightKg: cmd.WeightKg, Moisture: cmd.Moisture, CarbonSavedKg: cmd.ComputedCarbonSavedKg()}, nil
}

type fakeRecycleRepo struct {
	items    []domain.RecycleItem
	accounts []domain.BankAccountSummary
	err      error
}

func (f *fakeRecycleRepo) ListRecycleItems(context.Context, *int64) ([]domain.RecycleItem, error) {
	return f.items, f.err
}
func (f *fakeRecycleRepo) ListBankAccounts(context.Context, *int64) ([]domain.BankAccountSummary, error) {
	return f.accounts, f.err
}
func (f *fakeRecycleRepo) RecordPurchase(_ context.Context, orgID int64, cmd domain.RecordRecyclePurchaseCommand) (domain.RecyclePurchaseTransaction, error) {
	if f.err != nil {
		return domain.RecyclePurchaseTransaction{}, f.err
	}
	return domain.RecyclePurchaseTransaction{
		ID:          1,
		OrgID:       orgID,
		TransNo:     cmd.TransNo,
		UserID:      cmd.UserID,
		TotalWeight: cmd.TotalWeight,
		TotalAmount: cmd.TotalAmount,
		TotalPoints: cmd.TotalPoints,
		Status:      "completed",
	}, nil
}
func (f *fakeRecycleRepo) GetSubmodulesOverview(context.Context, *int64) (domain.RecycleSubmodulesOverview, error) {
	return domain.RecycleSubmodulesOverview{
		Kiosks: []domain.KioskSummary{{ID: 1, OrgID: 1, Name: "Kiosk-01", Status: "active"}},
	}, f.err
}
func (f *fakeRecycleRepo) IngestKioskTelemetry(_ context.Context, _ *int64, cmd domain.KioskIngestCommand) (domain.KioskSummary, error) {
	return domain.KioskSummary{ID: cmd.KioskID, OrgID: 1, Name: "Kiosk-01", Status: cmd.Status, TotalWasteCount: cmd.WasteCountDelta}, f.err
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
func (f *fakeTabwaterRepo) RecordMeterReading(_ context.Context, orgID int64, cmd domain.RecordMeterReadingCommand) (domain.WaterInvoice, error) {
	if f.err != nil {
		return domain.WaterInvoice{}, f.err
	}
	return domain.WaterInvoice{ID: 100, InvoiceNo: cmd.InvoiceNo, OrgID: orgID, MeterID: cmd.MeterID, PeriodID: cmd.PeriodID, CurrentMeter: cmd.CurrentMeter, Status: "invoice"}, nil
}
func (f *fakeTabwaterRepo) PayInvoice(_ context.Context, _ *int64, cmd domain.PayWaterInvoiceCommand) (domain.WaterInvoice, error) {
	if f.err != nil {
		return domain.WaterInvoice{}, f.err
	}
	return domain.WaterInvoice{ID: cmd.InvoiceID, Status: "paid"}, nil
}

func TestIdentityService(t *testing.T) {
	adminClaims := domain.Claims{Username: "admin1", Roles: []string{domain.RoleAdmin}, OrgID: i64(1)}
	userClaims := domain.Claims{Username: "user1", Roles: []string{domain.RoleUser}, OrgID: i64(1)}

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

	// GetResidentOverview (accessible by user1)
	ov, err := svc.GetResidentOverview(context.Background(), userClaims, nil)
	if err != nil || ov.Username != "user1" || ov.WaterMeters == nil || ov.Invoices == nil || ov.BankAccounts == nil {
		t.Fatalf("unexpected overview: %+v, err=%v", ov, err)
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

	// Write use cases
	createdItem, err := svc.CreateItem(context.Background(), adminClaims, nil, domain.CreateInventoryItemCommand{Code: "C-1", Name: "คลอรีน"})
	if err != nil || createdItem.Code != "C-1" {
		t.Fatalf("CreateItem failed: %+v, %v", createdItem, err)
	}
	createdTx, err := svc.CreateTransaction(context.Background(), adminClaims, nil, domain.CreateInventoryTransactionCommand{
		RefNo: "REQ-1", ItemID: 1, RequesterID: 1, Quantity: 2,
	})
	if err != nil || createdTx.Status != "PENDING" {
		t.Fatalf("CreateTransaction failed: %+v, %v", createdTx, err)
	}
	decidedTx, err := svc.DecideTransaction(context.Background(), adminClaims, nil, domain.TransactionDecisionCommand{
		TransactionID: 10, Decision: "approved",
	})
	if err != nil || decidedTx.Status != "APPROVED" {
		t.Fatalf("DecideTransaction failed: %+v, %v", decidedTx, err)
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

	batch, err := svc.CreateCompostBatch(context.Background(), staffClaims, nil, domain.CreateCompostBatchCommand{UserID: 1, BatchCode: "B-100"})
	if err != nil || batch.BatchCode != "B-100" {
		t.Fatalf("CreateCompostBatch failed: %+v, %v", batch, err)
	}
	logEntry, err := svc.CreateWasteLog(context.Background(), staffClaims, nil, domain.CreateWasteLogCommand{UserID: 1, WeightKg: 10, Moisture: "GOOD"})
	if err != nil || logEntry.CarbonSavedKg != 25.3 || logEntry.Moisture != "good" {
		t.Fatalf("CreateWasteLog failed: %+v, %v", logEntry, err)
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

	accounts, err := svc.ListBankAccounts(context.Background(), staffClaims, nil)
	if err != nil || accounts == nil {
		t.Fatalf("unexpected accounts: %v, %v", accounts, err)
	}

	purchase, err := svc.RecordPurchase(context.Background(), staffClaims, nil, domain.RecordRecyclePurchaseCommand{
		TransNo: "KP-2026-01", UserID: 1, TotalWeight: 5.5, TotalAmount: 45, TotalPoints: 50,
	})
	if err != nil || purchase.Status != "completed" {
		t.Fatalf("RecordPurchase failed: %+v, %v", purchase, err)
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

	readingInv, err := svc.RecordMeterReading(context.Background(), staffClaims, nil, domain.RecordMeterReadingCommand{
		InvoiceNo: "INV-100", MeterID: 1, PeriodID: 1, CurrentMeter: 150,
	})
	if err != nil || readingInv.Status != "invoice" {
		t.Fatalf("RecordMeterReading failed: %+v, %v", readingInv, err)
	}

	paidInv, err := svc.PayInvoice(context.Background(), staffClaims, nil, domain.PayWaterInvoiceCommand{
		InvoiceID: 100, CashierID: 1,
	})
	if err != nil || paidInv.Status != "paid" {
		t.Fatalf("PayInvoice failed: %+v, %v", paidInv, err)
	}
}
