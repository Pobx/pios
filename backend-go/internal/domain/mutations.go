package domain

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strings"
)

// ---- Wave 1.5: Resident Portal Overview (Role: user + staff) ----------------

type BankAccountSummary struct {
	ID         int64   `json:"id"`
	OrgID      int64   `json:"org_id"`
	UserID     int64   `json:"user_id"`
	EntityType string  `json:"entity_type"`
	AccountNo  string  `json:"account_no"`
	Balance    float64 `json:"balance"`
	Points     int     `json:"points"`
	Status     string  `json:"status"`
}

type ResidentOverview struct {
	Username     string               `json:"username"`
	OrgID        *int64               `json:"org_id"`
	WaterMeters  []WaterMeter         `json:"water_meters"`
	Invoices     []WaterInvoice       `json:"invoices"`
	BankAccounts []BankAccountSummary `json:"bank_accounts"`
}

// ---- Wave 2: Inventory Write & Approval Commands ----------------------------

type CreateInventoryItemCommand struct {
	CategoryID     int64  `json:"category_id"`
	Code           string `json:"code"`
	Name           string `json:"name"`
	Unit           string `json:"unit"`
	MinStock       int    `json:"min_stock"`
	ItemType       string `json:"item_type"`
	IsChemical     bool   `json:"is_chemical"`
	ReturnRequired bool   `json:"return_required"`
}

func (cmd CreateInventoryItemCommand) Validate() error {
	if strings.TrimSpace(cmd.Name) == "" || strings.TrimSpace(cmd.Code) == "" {
		return ErrBadRequest
	}
	if cmd.MinStock < 0 {
		return ErrBadRequest
	}
	return nil
}

type CreateInventoryTransactionCommand struct {
	RefNo       string `json:"ref_no"`
	ItemID      int64  `json:"item_id"`
	RequesterID int64  `json:"requester_id"`
	Quantity    int    `json:"quantity"`
	Purpose     string `json:"purpose"`
}

func (cmd CreateInventoryTransactionCommand) Validate() error {
	if cmd.ItemID <= 0 || cmd.RequesterID <= 0 || cmd.Quantity <= 0 {
		return ErrBadRequest
	}
	if strings.TrimSpace(cmd.RefNo) == "" {
		return ErrBadRequest
	}
	return nil
}

type TransactionDecisionCommand struct {
	TransactionID int64  `json:"transaction_id"`
	Decision      string `json:"decision"` // "APPROVED" | "REJECTED"
	Comment       string `json:"comment"`
}

func (cmd TransactionDecisionCommand) Validate() error {
	if cmd.TransactionID <= 0 {
		return ErrBadRequest
	}
	d := strings.ToUpper(strings.TrimSpace(cmd.Decision))
	if d != "APPROVED" && d != "REJECTED" {
		return ErrBadRequest
	}
	return nil
}

// ---- Wave 3: FoodWaste Write Commands ---------------------------------------

type CreateCompostBatchCommand struct {
	UserID    int64  `json:"user_id"`
	BatchCode string `json:"batch_code"`
	StartDate string `json:"start_date"` // YYYY-MM-DD
}

func (cmd CreateCompostBatchCommand) Validate() error {
	if cmd.UserID <= 0 || strings.TrimSpace(cmd.BatchCode) == "" {
		return ErrBadRequest
	}
	return nil
}

type CreateWasteLogCommand struct {
	BatchID   *int64  `json:"batch_id"`
	UserID    int64   `json:"user_id"`
	WeightKg  float64 `json:"weight_kg"`
	Moisture  string  `json:"moisture"` // "dry" | "good" | "wet"
	EFValue   float64 `json:"ef_value"` // optional override; defaults to 2.53 kgCO2e/kg
}

func (cmd CreateWasteLogCommand) Validate() error {
	if cmd.UserID <= 0 || cmd.WeightKg <= 0 {
		return ErrBadRequest
	}
	switch strings.ToLower(strings.TrimSpace(cmd.Moisture)) {
	case "dry", "good", "wet":
	default:
		return ErrBadRequest
	}
	return nil
}

func (cmd CreateWasteLogCommand) ComputedCarbonSavedKg() float64 {
	ef := cmd.EFValue
	if ef <= 0 {
		ef = 2.53 // Default TGO organic waste emission factor
	}
	return round2(cmd.WeightKg * ef)
}

type WasteLogEntry struct {
	ID            int64   `json:"id"`
	BatchID       *int64  `json:"batch_id"`
	UserID        int64   `json:"user_id"`
	WeightKg      float64 `json:"weight_kg"`
	Moisture      string  `json:"moisture"`
	CarbonSavedKg float64 `json:"carbon_saved_kg"`
}

// ---- Wave 4: KeptKaya / Recycle Bank Write Commands -------------------------

type RecordRecyclePurchaseCommand struct {
	TransNo     string  `json:"trans_no"`
	UserID      int64   `json:"user_id"`
	TotalWeight float64 `json:"total_weight"`
	TotalAmount float64 `json:"total_amount"`
	TotalPoints int     `json:"total_points"`
}

func (cmd RecordRecyclePurchaseCommand) Validate() error {
	if cmd.UserID <= 0 || strings.TrimSpace(cmd.TransNo) == "" {
		return ErrBadRequest
	}
	if cmd.TotalWeight <= 0 || cmd.TotalAmount < 0 || cmd.TotalPoints < 0 {
		return ErrBadRequest
	}
	return nil
}

type RecyclePurchaseTransaction struct {
	ID          int64   `json:"id"`
	OrgID       int64   `json:"org_id"`
	TransNo     string  `json:"trans_no"`
	UserID      int64   `json:"user_id"`
	TotalWeight float64 `json:"total_weight"`
	TotalAmount float64 `json:"total_amount"`
	TotalPoints int     `json:"total_points"`
	Status      string  `json:"status"`
}

// ---- Wave 5: Tabwater Meter Reading & Invoice Payment Commands --------------

type RecordMeterReadingCommand struct {
	InvoiceNo    string  `json:"inv_no"`
	MeterID      int64   `json:"meter_id"`
	PeriodID     int64   `json:"period_id"`
	CurrentMeter float64 `json:"current_meter"`
	ReserveFee   float64 `json:"reserve_fee"`
	VatPercent   float64 `json:"vat_percent"`
}

func (cmd RecordMeterReadingCommand) Validate() error {
	if cmd.MeterID <= 0 || cmd.PeriodID <= 0 || cmd.CurrentMeter < 0 {
		return ErrBadRequest
	}
	if strings.TrimSpace(cmd.InvoiceNo) == "" {
		return ErrBadRequest
	}
	return nil
}

type PayWaterInvoiceCommand struct {
	InvoiceID int64 `json:"invoice_id"`
	CashierID int64 `json:"cashier_id"`
}

func (cmd PayWaterInvoiceCommand) Validate() error {
	if cmd.InvoiceID <= 0 || cmd.CashierID <= 0 {
		return ErrBadRequest
	}
	return nil
}

// ---- Wave 6: IoT Smart Kiosk Telemetry Ingest & LINE Webhook Verification ----

type KioskIngestCommand struct {
	KioskID         int64  `json:"kiosk_id"`
	WasteCountDelta int    `json:"waste_count_delta"`
	Status          string `json:"status"` // "idle" | "active" | "maintenance" | "offline"
}

func (cmd KioskIngestCommand) Validate() error {
	if cmd.KioskID <= 0 || cmd.WasteCountDelta < 0 {
		return ErrBadRequest
	}
	s := strings.ToLower(strings.TrimSpace(cmd.Status))
	switch s {
	case "", "idle", "active", "maintenance", "offline":
	default:
		return ErrBadRequest
	}
	return nil
}

// VerifyLineWebhookSignature validates X-Line-Signature HMAC-SHA256 against the raw webhook request body.
func VerifyLineWebhookSignature(channelSecret string, body []byte, signatureBase64 string) bool {
	secret := strings.TrimSpace(channelSecret)
	sig := strings.TrimSpace(signatureBase64)
	if secret == "" || sig == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := mac.Sum(nil)
	got, err := base64.StdEncoding.DecodeString(sig)
	if err != nil {
		return false
	}
	return hmac.Equal(expected, got)
}
