package app

import (
	"context"
	"strings"

	"github.com/otp2025/backend-go/internal/domain"
)

func resolveRequiredOrgID(claims domain.Claims, requestedOrgID *int64) (int64, error) {
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return 0, err
	}
	if orgID != nil {
		return *orgID, nil
	}
	// Default to org 1 when super_admin omits X-Org-Id on a write command
	return 1, nil
}

// ---- Wave 1.5: Resident Portal Overview (accessible by role: user & staff) --

func (s *IdentityService) GetResidentOverview(ctx context.Context, claims domain.Claims, requestedOrgID *int64) (domain.ResidentOverview, error) {
	if strings.TrimSpace(claims.Username) == "" {
		return domain.ResidentOverview{}, domain.ErrUnauthorized
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil && !claims.HasAnyRole(domain.RoleUser) {
		return domain.ResidentOverview{}, err
	}
	if orgID == nil && claims.OrgID != nil {
		orgID = claims.OrgID
	}
	ov, err := s.repo.GetResidentOverview(ctx, orgID, claims.Username)
	if err != nil {
		return domain.ResidentOverview{}, err
	}
	if ov.WaterMeters == nil {
		ov.WaterMeters = []domain.WaterMeter{}
	}
	if ov.Invoices == nil {
		ov.Invoices = []domain.WaterInvoice{}
	}
	if ov.BankAccounts == nil {
		ov.BankAccounts = []domain.BankAccountSummary{}
	}
	return ov, nil
}

// ---- Wave 2: Inventory Write & Approval Use Cases ---------------------------

func (s *InventoryService) CreateItem(ctx context.Context, claims domain.Claims, requestedOrgID *int64, cmd domain.CreateInventoryItemCommand) (domain.InventoryItem, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFinanceStaff) {
		return domain.InventoryItem{}, domain.ErrForbidden
	}
	orgID, err := resolveRequiredOrgID(claims, requestedOrgID)
	if err != nil {
		return domain.InventoryItem{}, err
	}
	if err := cmd.Validate(); err != nil {
		return domain.InventoryItem{}, err
	}
	return s.repo.CreateItem(ctx, orgID, cmd)
}

func (s *InventoryService) CreateTransaction(ctx context.Context, claims domain.Claims, requestedOrgID *int64, cmd domain.CreateInventoryTransactionCommand) (domain.InventoryTransaction, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFinanceStaff) {
		return domain.InventoryTransaction{}, domain.ErrForbidden
	}
	orgID, err := resolveRequiredOrgID(claims, requestedOrgID)
	if err != nil {
		return domain.InventoryTransaction{}, err
	}
	if err := cmd.Validate(); err != nil {
		return domain.InventoryTransaction{}, err
	}
	return s.repo.CreateTransaction(ctx, orgID, cmd)
}

func (s *InventoryService) DecideTransaction(ctx context.Context, claims domain.Claims, requestedOrgID *int64, cmd domain.TransactionDecisionCommand) (domain.InventoryTransaction, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin) {
		return domain.InventoryTransaction{}, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return domain.InventoryTransaction{}, err
	}
	if err := cmd.Validate(); err != nil {
		return domain.InventoryTransaction{}, err
	}
	cmd.Decision = strings.ToUpper(strings.TrimSpace(cmd.Decision))
	return s.repo.DecideTransaction(ctx, orgID, cmd)
}

// ---- Wave 3: FoodWaste Write Use Cases --------------------------------------

func (s *FoodWasteService) CreateCompostBatch(ctx context.Context, claims domain.Claims, requestedOrgID *int64, cmd domain.CreateCompostBatchCommand) (domain.CompostBatch, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFoodwasteStaff) {
		return domain.CompostBatch{}, domain.ErrForbidden
	}
	if _, err := claims.ResolveOrgScope(requestedOrgID); err != nil {
		return domain.CompostBatch{}, err
	}
	if err := cmd.Validate(); err != nil {
		return domain.CompostBatch{}, err
	}
	return s.repo.CreateCompostBatch(ctx, cmd)
}

func (s *FoodWasteService) CreateWasteLog(ctx context.Context, claims domain.Claims, requestedOrgID *int64, cmd domain.CreateWasteLogCommand) (domain.WasteLogEntry, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFoodwasteStaff) {
		return domain.WasteLogEntry{}, domain.ErrForbidden
	}
	if _, err := claims.ResolveOrgScope(requestedOrgID); err != nil {
		return domain.WasteLogEntry{}, err
	}
	if err := cmd.Validate(); err != nil {
		return domain.WasteLogEntry{}, err
	}
	cmd.Moisture = strings.ToLower(strings.TrimSpace(cmd.Moisture))
	return s.repo.CreateWasteLog(ctx, cmd)
}

// ---- Wave 4: KeptKaya / Recycle Bank Write Use Cases ------------------------

func (s *RecycleService) ListBankAccounts(ctx context.Context, claims domain.Claims, requestedOrgID *int64) ([]domain.BankAccountSummary, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleRecycleBankStaff, domain.RoleFinanceStaff) {
		return nil, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return nil, err
	}
	accounts, err := s.repo.ListBankAccounts(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if accounts == nil {
		return []domain.BankAccountSummary{}, nil
	}
	return accounts, nil
}

func (s *RecycleService) RecordPurchase(ctx context.Context, claims domain.Claims, requestedOrgID *int64, cmd domain.RecordRecyclePurchaseCommand) (domain.RecyclePurchaseTransaction, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleRecycleBankStaff, domain.RoleFinanceStaff) {
		return domain.RecyclePurchaseTransaction{}, domain.ErrForbidden
	}
	orgID, err := resolveRequiredOrgID(claims, requestedOrgID)
	if err != nil {
		return domain.RecyclePurchaseTransaction{}, err
	}
	if err := cmd.Validate(); err != nil {
		return domain.RecyclePurchaseTransaction{}, err
	}
	return s.repo.RecordPurchase(ctx, orgID, cmd)
}

// ---- Wave 5: Tabwater Meter Reading & Invoice Payment Use Cases -------------

func (s *TabwaterService) RecordMeterReading(ctx context.Context, claims domain.Claims, requestedOrgID *int64, cmd domain.RecordMeterReadingCommand) (domain.WaterInvoice, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleTabwaterStaff, domain.RoleFinanceStaff) {
		return domain.WaterInvoice{}, domain.ErrForbidden
	}
	orgID, err := resolveRequiredOrgID(claims, requestedOrgID)
	if err != nil {
		return domain.WaterInvoice{}, err
	}
	if err := cmd.Validate(); err != nil {
		return domain.WaterInvoice{}, err
	}
	return s.repo.RecordMeterReading(ctx, orgID, cmd)
}

func (s *TabwaterService) PayInvoice(ctx context.Context, claims domain.Claims, requestedOrgID *int64, cmd domain.PayWaterInvoiceCommand) (domain.WaterInvoice, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleTabwaterStaff, domain.RoleFinanceStaff) {
		return domain.WaterInvoice{}, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return domain.WaterInvoice{}, err
	}
	if err := cmd.Validate(); err != nil {
		return domain.WaterInvoice{}, err
	}
	return s.repo.PayInvoice(ctx, orgID, cmd)
}
