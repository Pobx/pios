package app

import (
	"context"
	"strings"

	"github.com/otp2025/backend-go/internal/domain"
)

func clampPagination(limit, offset int) (int, int) {
	if limit <= 0 {
		limit = 50
	} else if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

// ---- Wave 1.5: IdentityService (Users, Zones, Safe LINE Account Linking) ----

type IdentityService struct {
	repo domain.IdentityRepository
}

func NewIdentityService(repo domain.IdentityRepository) *IdentityService {
	return &IdentityService{repo: repo}
}

func (s *IdentityService) ListUsers(ctx context.Context, claims domain.Claims, requestedOrgID *int64, query string, limit, offset int) ([]domain.UserSummary, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFinanceStaff, domain.RoleTabwaterStaff, domain.RoleRecycleBankStaff, domain.RoleFoodwasteStaff, domain.RoleAnnualStaff) {
		return nil, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return nil, err
	}
	limit, offset = clampPagination(limit, offset)
	users, err := s.repo.ListUsers(ctx, orgID, strings.TrimSpace(query), limit, offset)
	if err != nil {
		return nil, err
	}
	if users == nil {
		return []domain.UserSummary{}, nil
	}
	return users, nil
}

func (s *IdentityService) ListZones(ctx context.Context, claims domain.Claims, requestedOrgID *int64) ([]domain.Zone, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFinanceStaff, domain.RoleTabwaterStaff, domain.RoleRecycleBankStaff, domain.RoleFoodwasteStaff, domain.RoleAnnualStaff) {
		return nil, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return nil, err
	}
	zones, err := s.repo.ListZones(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if zones == nil {
		return []domain.Zone{}, nil
	}
	return zones, nil
}

func (s *IdentityService) LinkLineAccount(ctx context.Context, claims domain.Claims, requestedOrgID *int64, cmd domain.LineLinkCommand) (domain.UserSummary, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin) {
		return domain.UserSummary{}, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return domain.UserSummary{}, err
	}
	if err := cmd.Validate(); err != nil {
		return domain.UserSummary{}, err
	}
	return s.repo.LinkUserLineAccount(ctx, orgID, cmd.TargetUserID, strings.TrimSpace(cmd.LineUserID))
}

// ---- Wave 2: InventoryService -----------------------------------------------

type InventoryService struct {
	repo domain.InventoryRepository
}

func NewInventoryService(repo domain.InventoryRepository) *InventoryService {
	return &InventoryService{repo: repo}
}

func (s *InventoryService) ListItems(ctx context.Context, claims domain.Claims, requestedOrgID *int64) ([]domain.InventoryItem, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFinanceStaff) {
		return nil, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return nil, err
	}
	items, err := s.repo.ListItems(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if items == nil {
		return []domain.InventoryItem{}, nil
	}
	return items, nil
}

func (s *InventoryService) ListTransactions(ctx context.Context, claims domain.Claims, requestedOrgID *int64) ([]domain.InventoryTransaction, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFinanceStaff) {
		return nil, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return nil, err
	}
	txs, err := s.repo.ListTransactions(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if txs == nil {
		return []domain.InventoryTransaction{}, nil
	}
	return txs, nil
}

// ---- Wave 3: FoodWasteService -----------------------------------------------

type FoodWasteService struct {
	repo domain.FoodWasteRepository
}

func NewFoodWasteService(repo domain.FoodWasteRepository) *FoodWasteService {
	return &FoodWasteService{repo: repo}
}

func (s *FoodWasteService) GetSummary(ctx context.Context, claims domain.Claims, requestedOrgID *int64) (domain.FoodWasteSummary, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFoodwasteStaff) {
		return domain.FoodWasteSummary{}, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return domain.FoodWasteSummary{}, err
	}
	summary, err := s.repo.GetSummary(ctx, orgID)
	if err != nil {
		return domain.FoodWasteSummary{}, err
	}
	if summary.Batches == nil {
		summary.Batches = []domain.CompostBatch{}
	}
	if summary.EmissionFactors == nil {
		summary.EmissionFactors = []domain.EmissionFactor{}
	}
	return summary, nil
}

// ---- Wave 4: RecycleService (KeptKaya / Recycle Bank) -----------------------

type RecycleService struct {
	repo domain.RecycleRepository
}

func NewRecycleService(repo domain.RecycleRepository) *RecycleService {
	return &RecycleService{repo: repo}
}

func (s *RecycleService) ListItems(ctx context.Context, claims domain.Claims, requestedOrgID *int64) ([]domain.RecycleItem, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleRecycleBankStaff, domain.RoleFinanceStaff, domain.RoleAnnualStaff) {
		return nil, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return nil, err
	}
	items, err := s.repo.ListRecycleItems(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if items == nil {
		return []domain.RecycleItem{}, nil
	}
	return items, nil
}

func (s *RecycleService) GetSubmodulesOverview(ctx context.Context, claims domain.Claims, requestedOrgID *int64) (domain.RecycleSubmodulesOverview, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleRecycleBankStaff, domain.RoleFinanceStaff, domain.RoleAnnualStaff) {
		return domain.RecycleSubmodulesOverview{}, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return domain.RecycleSubmodulesOverview{}, err
	}
	ov, err := s.repo.GetSubmodulesOverview(ctx, orgID)
	if err != nil {
		return domain.RecycleSubmodulesOverview{}, err
	}
	if ov.Kiosks == nil {
		ov.Kiosks = []domain.KioskSummary{}
	}
	if ov.WelfareConfigs == nil {
		ov.WelfareConfigs = []domain.WelfareConfig{}
	}
	if ov.WelfarePayouts == nil {
		ov.WelfarePayouts = []domain.WelfarePayout{}
	}
	if ov.AnnualTrashSubscriptions == nil {
		ov.AnnualTrashSubscriptions = []domain.AnnualTrashSubscription{}
	}
	return ov, nil
}

// ---- Wave 5: TabwaterService (Meters & Invoices) ----------------------------

type TabwaterService struct {
	repo domain.TabwaterRepository
}

func NewTabwaterService(repo domain.TabwaterRepository) *TabwaterService {
	return &TabwaterService{repo: repo}
}

func (s *TabwaterService) ListMeters(ctx context.Context, claims domain.Claims, requestedOrgID *int64, limit, offset int) ([]domain.WaterMeter, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleTabwaterStaff, domain.RoleFinanceStaff) {
		return nil, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return nil, err
	}
	limit, offset = clampPagination(limit, offset)
	meters, err := s.repo.ListMeters(ctx, orgID, limit, offset)
	if err != nil {
		return nil, err
	}
	if meters == nil {
		return []domain.WaterMeter{}, nil
	}
	return meters, nil
}

func (s *TabwaterService) ListInvoices(ctx context.Context, claims domain.Claims, requestedOrgID *int64, status string, limit, offset int) ([]domain.WaterInvoice, error) {
	if !claims.HasAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleTabwaterStaff, domain.RoleFinanceStaff) {
		return nil, domain.ErrForbidden
	}
	orgID, err := claims.ResolveOrgScope(requestedOrgID)
	if err != nil {
		return nil, err
	}
	limit, offset = clampPagination(limit, offset)
	invoices, err := s.repo.ListInvoices(ctx, orgID, strings.TrimSpace(status), limit, offset)
	if err != nil {
		return nil, err
	}
	if invoices == nil {
		return []domain.WaterInvoice{}, nil
	}
	return invoices, nil
}
