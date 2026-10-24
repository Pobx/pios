package domain

import (
	"context"
	"math"
	"sort"
	"strings"
)

// ResolveOrgScope enforces multi-tenant isolation without mutating database state.
// - super_admin may optionally pass requestedOrgID (via X-Org-Id or ?org_id=) to scope queries,
//   or nil to query across all organizations.
// - All other roles must have a non-nil Claims.OrgID and cannot access another org.
func (c Claims) ResolveOrgScope(requestedOrgID *int64) (*int64, error) {
	if c.HasAnyRole(RoleSuperAdmin) {
		return requestedOrgID, nil
	}
	if c.OrgID == nil {
		return nil, ErrForbidden
	}
	if requestedOrgID != nil && *requestedOrgID != *c.OrgID {
		return nil, ErrForbidden
	}
	return c.OrgID, nil
}

// ---- Wave 1.5: Identity, Users, Zones & LINE Linking ------------------------

type UserSummary struct {
	ID         int64   `json:"id"`
	OrgID      *int64  `json:"org_id"`
	Username   string  `json:"username"`
	Prefix     string  `json:"prefix"`
	FirstName  string  `json:"firstname"`
	LastName   string  `json:"lastname"`
	Email      string  `json:"email"`
	Phone      string  `json:"phone"`
	Address    string  `json:"address"`
	ZoneID     *int64  `json:"zone_id"`
	SubzoneID  *int64  `json:"subzone_id"`
	LineUserID string  `json:"line_user_id"`
	Status     string  `json:"status"`
}

type Zone struct {
	ID       int64     `json:"id"`
	OrgID    *int64    `json:"org_id"`
	Name     string    `json:"zone_name"`
	Status   string    `json:"status"`
	Subzones []Subzone `json:"subzones"`
}

type Subzone struct {
	ID     int64  `json:"id"`
	OrgID  *int64 `json:"org_id"`
	ZoneID int64  `json:"zone_id"`
	Name   string `json:"subzone_name"`
	Status string `json:"status"`
}

type LineLinkCommand struct {
	TargetUserID     int64  `json:"target_user_id"`
	LineUserID       string `json:"line_user_id"`
	VerificationMode string `json:"verification_mode"` // "staff_code" | "staff_approval" | "password"
	VerificationCode string `json:"verification_code"`
}

func (cmd LineLinkCommand) Validate() error {
	if cmd.TargetUserID <= 0 {
		return ErrBadRequest
	}
	trimmedLine := strings.TrimSpace(cmd.LineUserID)
	if len(trimmedLine) < 4 {
		return ErrBadRequest
	}
	switch cmd.VerificationMode {
	case "staff_code", "staff_approval", "password":
	default:
		return ErrBadRequest
	}
	if strings.TrimSpace(cmd.VerificationCode) == "" {
		return ErrBadRequest
	}
	return nil
}

type IdentityRepository interface {
	ListUsers(ctx context.Context, orgID *int64, query string, limit, offset int) ([]UserSummary, error)
	ListZones(ctx context.Context, orgID *int64) ([]Zone, error)
	LinkUserLineAccount(ctx context.Context, orgID *int64, userID int64, lineUserID string) (UserSummary, error)
	GetResidentOverview(ctx context.Context, orgID *int64, username string) (ResidentOverview, error)
	CreateUser(ctx context.Context, orgID int64, cmd CreateUserCommand) (UserSummary, error)
	CreateZone(ctx context.Context, orgID int64, cmd CreateZoneCommand) (Zone, error)
}

// ---- Wave 2: Inventory Module -----------------------------------------------

type InventoryItem struct {
	ID             int64  `json:"id"`
	OrgID          int64  `json:"org_id"`
	CategoryID     int64  `json:"category_id"`
	CategoryName   string `json:"category_name"`
	Code           string `json:"code"`
	Name           string `json:"name"`
	Unit           string `json:"unit"`
	MinStock       int    `json:"min_stock"`
	ItemType       string `json:"item_type"`
	IsChemical     bool   `json:"is_chemical"`
	ReturnRequired bool   `json:"return_required"`
}

type InventoryTransaction struct {
	ID          int64  `json:"id"`
	OrgID       int64  `json:"org_id"`
	RefNo       string `json:"ref_no"`
	ItemID      int64  `json:"item_id"`
	ItemName    string `json:"item_name"`
	RequesterID int64  `json:"requester_id"`
	Quantity    int    `json:"quantity"`
	Purpose     string `json:"purpose"`
	Status      string `json:"status"`
	CurrentStep int    `json:"current_step"`
}

type InventoryRepository interface {
	ListItems(ctx context.Context, orgID *int64) ([]InventoryItem, error)
	ListTransactions(ctx context.Context, orgID *int64) ([]InventoryTransaction, error)
	CreateItem(ctx context.Context, orgID int64, cmd CreateInventoryItemCommand) (InventoryItem, error)
	CreateTransaction(ctx context.Context, orgID int64, cmd CreateInventoryTransactionCommand) (InventoryTransaction, error)
	DecideTransaction(ctx context.Context, orgID *int64, cmd TransactionDecisionCommand) (InventoryTransaction, error)
}

// ---- Wave 3: FoodWaste & Carbon Emission Module -----------------------------

type CompostBatch struct {
	ID         int64  `json:"id"`
	UserID     int64  `json:"user_id"`
	BatchCode  string `json:"batch_code"`
	Status     string `json:"status"`
	StartDate  string `json:"start_date"`
	ClosedDate string `json:"closed_date,omitempty"`
}

type EmissionFactor struct {
	ID           int64   `json:"id"`
	MaterialName string  `json:"material_name"`
	Unit         string  `json:"unit"`
	EFValue      float64 `json:"ef_value"`
	Source       string  `json:"source"`
}

type FoodWasteSummary struct {
	TotalBatches       int              `json:"total_batches"`
	TotalWasteLogs     int              `json:"total_waste_logs"`
	TotalWeightKg      float64          `json:"total_weight_kg"`
	TotalCarbonSavedKg float64          `json:"total_carbon_saved_kg"`
	Batches            []CompostBatch   `json:"batches"`
	EmissionFactors    []EmissionFactor `json:"emission_factors"`
}

type FoodWasteRepository interface {
	GetSummary(ctx context.Context, orgID *int64) (FoodWasteSummary, error)
	CreateCompostBatch(ctx context.Context, cmd CreateCompostBatchCommand) (CompostBatch, error)
	CreateWasteLog(ctx context.Context, cmd CreateWasteLogCommand) (WasteLogEntry, error)
}

// ---- Wave 4: KeptKaya / Recycle Bank Module ---------------------------------

type RecycleItem struct {
	ID              int64   `json:"id"`
	OrgID           int64   `json:"org_id"`
	Code            string  `json:"code"`
	Name            string  `json:"name"`
	GroupID         int64   `json:"group_id"`
	GroupName       string  `json:"group_name"`
	Status          string  `json:"status"`
	PriceFromDealer float64 `json:"price_from_dealer"`
	PriceForMember  float64 `json:"price_for_member"`
	Point           float64 `json:"point"`
}

type KioskSummary struct {
	ID              int64   `json:"id"`
	OrgID           int64   `json:"org_id"`
	Name            string  `json:"name"`
	Lat             float64 `json:"lat"`
	Lng             float64 `json:"lng"`
	Status          string  `json:"status"`
	TotalWasteCount int     `json:"total_waste_count"`
}

type WelfareConfig struct {
	ID                  int64   `json:"id"`
	OrgID               int64   `json:"org_id"`
	MinMonthsActive     int     `json:"min_months_active"`
	MinTotalWeight      int     `json:"min_total_weight"`
	DefaultPayoutAmount float64 `json:"default_payout_amount"`
	CriteriaDescription string  `json:"criteria_description"`
}

type WelfarePayout struct {
	ID              int64   `json:"id"`
	OrgID           int64   `json:"org_id"`
	DeceasedName    string  `json:"deceased_name"`
	BeneficiaryName string  `json:"beneficiary_name"`
	Amount          float64 `json:"amount"`
	Status          string  `json:"status"`
}

type AnnualTrashSubscription struct {
	ID           int64   `json:"id"`
	FiscalYear   string  `json:"fiscal_year"`
	UserID       int64   `json:"user_id"`
	AnnualFee    float64 `json:"annual_fee"`
	MonthFee     float64 `json:"month_fee"`
	TotalPaidAmt float64 `json:"total_paid_amt"`
	Status       string  `json:"status"`
}

type RecycleSubmodulesOverview struct {
	Kiosks                   []KioskSummary            `json:"kiosks"`
	WelfareConfigs           []WelfareConfig           `json:"welfare_configs"`
	WelfarePayouts           []WelfarePayout           `json:"welfare_payouts"`
	AnnualTrashSubscriptions []AnnualTrashSubscription `json:"annual_trash_subscriptions"`
}

type RecycleRepository interface {
	ListRecycleItems(ctx context.Context, orgID *int64) ([]RecycleItem, error)
	ListBankAccounts(ctx context.Context, orgID *int64) ([]BankAccountSummary, error)
	RecordPurchase(ctx context.Context, orgID int64, cmd RecordRecyclePurchaseCommand) (RecyclePurchaseTransaction, error)
	GetSubmodulesOverview(ctx context.Context, orgID *int64) (RecycleSubmodulesOverview, error)
	IngestKioskTelemetry(ctx context.Context, orgID *int64, cmd KioskIngestCommand) (KioskSummary, error)
	WithdrawMemberBalance(ctx context.Context, orgID int64, cmd CreateRecycleWithdrawalCommand) (BankAccountSummary, error)
	SetRecycleItemPrice(ctx context.Context, orgID int64, cmd SetRecycleItemPriceCommand) (RecycleItem, error)
}

// ---- Wave 5: Tabwater Module (Meters, Invoices & Progressive Tariff) --------

type WaterMeter struct {
	MeterID            int64  `json:"meter_id"`
	OrgID              int64  `json:"org_id"`
	UserID             int64  `json:"user_id"`
	MeterNumber        string `json:"meternumber"`
	SubmeterName       string `json:"submeter_name"`
	MeterAddress       string `json:"meter_address"`
	UndertakeZoneID    int64  `json:"undertake_zone_id"`
	UndertakeSubzoneID int64  `json:"undertake_subzone_id"`
	Status             string `json:"status"`
	OweCount           int    `json:"owe_count"`
	CutMeter           string `json:"cutmeter"`
	LastMeterRecording int    `json:"last_meter_recording"`
}

type WaterInvoice struct {
	ID           int64   `json:"id"`
	InvoiceNo    string  `json:"inv_no"`
	OrgID        int64   `json:"org_id"`
	MeterID      int64   `json:"meter_id"`
	PeriodID     int64   `json:"period_id"`
	PeriodName   string  `json:"period_name"`
	LastMeter    float64 `json:"lastmeter"`
	CurrentMeter float64 `json:"currentmeter"`
	WaterUsed    float64 `json:"water_used"`
	Paid         float64 `json:"paid"`
	ReserveMeter float64 `json:"reserve_meter"`
	Vat          float64 `json:"vat"`
	TotalPaid    float64 `json:"totalpaid"`
	Status       string  `json:"status"`
}

type RateTier struct {
	TierOrder   int     `json:"tier_order"`
	MinUnits    int     `json:"min_units"`
	MaxUnits    *int    `json:"max_units,omitempty"`
	RatePerUnit float64 `json:"rate_per_unit"`
}

type WaterBillBreakdown struct {
	UnitsUsed    float64 `json:"units_used"`
	WaterCharge  float64 `json:"water_charge"`
	ReserveFee   float64 `json:"reserve_fee"`
	VatAmount    float64 `json:"vat_amount"`
	TotalPayable float64 `json:"total_payable"`
}

// CalculateProgressiveWaterBill calculates progressive tiered water charge + reserve meter fee + VAT.
func CalculateProgressiveWaterBill(unitsUsed float64, tiers []RateTier, reserveFee float64, vatRatePercent float64) WaterBillBreakdown {
	if unitsUsed <= 0 || len(tiers) == 0 {
		sub := math.Max(0, reserveFee)
		vat := round2(sub * math.Max(0, vatRatePercent) / 100.0)
		return WaterBillBreakdown{
			UnitsUsed:    math.Max(0, unitsUsed),
			WaterCharge:  0,
			ReserveFee:   round2(sub),
			VatAmount:    vat,
			TotalPayable: round2(sub + vat),
		}
	}

	sorted := make([]RateTier, len(tiers))
	copy(sorted, tiers)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].TierOrder < sorted[j].TierOrder
	})

	remaining := unitsUsed
	var charge float64
	prevMax := 0.0

	for _, tier := range sorted {
		if remaining <= 0 {
			break
		}
		var tierCapacity float64
		if tier.MaxUnits == nil || *tier.MaxUnits <= 0 {
			tierCapacity = remaining
		} else {
			bandWidth := float64(*tier.MaxUnits) - prevMax
			if bandWidth < 0 {
				bandWidth = 0
			}
			tierCapacity = math.Min(remaining, bandWidth)
			prevMax = float64(*tier.MaxUnits)
		}
		charge += tierCapacity * tier.RatePerUnit
		remaining -= tierCapacity
	}

	charge = round2(charge)
	reserve := round2(math.Max(0, reserveFee))
	subTotal := charge + reserve
	vat := round2(subTotal * math.Max(0, vatRatePercent) / 100.0)

	return WaterBillBreakdown{
		UnitsUsed:    unitsUsed,
		WaterCharge:  charge,
		ReserveFee:   reserve,
		VatAmount:    vat,
		TotalPayable: round2(subTotal + vat),
	}
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

type InvoicePeriod struct {
	ID         int64  `json:"id"`
	OrgID      int64  `json:"org_id"`
	PeriodName string `json:"period_name"`
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
	Status     string `json:"status"`
}

type TabwaterRepository interface {
	ListMeters(ctx context.Context, orgID *int64, limit, offset int) ([]WaterMeter, error)
	ListInvoices(ctx context.Context, orgID *int64, status string, limit, offset int) ([]WaterInvoice, error)
	RecordMeterReading(ctx context.Context, orgID int64, cmd RecordMeterReadingCommand) (WaterInvoice, error)
	PayInvoice(ctx context.Context, orgID *int64, cmd PayWaterInvoiceCommand) (WaterInvoice, error)
	ListPeriods(ctx context.Context, orgID *int64) ([]InvoicePeriod, error)
	CreatePeriod(ctx context.Context, orgID int64, cmd CreateInvoicePeriodCommand) (InvoicePeriod, error)
	CreateMeter(ctx context.Context, orgID int64, cmd CreateWaterMeterCommand) (WaterMeter, error)
}
