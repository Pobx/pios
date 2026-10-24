package domain_test

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"testing"

	"github.com/otp2025/backend-go/internal/domain"
)

func TestMutationCommandValidations(t *testing.T) {
	t.Run("CreateInventoryItemCommand.Validate", func(t *testing.T) {
		ok := domain.CreateInventoryItemCommand{Code: "INV-01", Name: "คลอรีน", MinStock: 0}
		if err := ok.Validate(); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if err := (domain.CreateInventoryItemCommand{Code: "", Name: "คลอรีน"}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}
		if err := (domain.CreateInventoryItemCommand{Code: "C", Name: "N", MinStock: -1}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}
	})

	t.Run("CreateInventoryTransactionCommand.Validate", func(t *testing.T) {
		ok := domain.CreateInventoryTransactionCommand{RefNo: "REQ-01", ItemID: 1, RequesterID: 1, Quantity: 2}
		if err := ok.Validate(); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if err := (domain.CreateInventoryTransactionCommand{RefNo: "", ItemID: 1, RequesterID: 1, Quantity: 2}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}
		if err := (domain.CreateInventoryTransactionCommand{RefNo: "REQ", ItemID: 0, RequesterID: 1, Quantity: 2}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}
	})

	t.Run("TransactionDecisionCommand.Validate", func(t *testing.T) {
		if err := (domain.TransactionDecisionCommand{TransactionID: 1, Decision: "approved"}).Validate(); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if err := (domain.TransactionDecisionCommand{TransactionID: 1, Decision: "REJECTED"}).Validate(); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if err := (domain.TransactionDecisionCommand{TransactionID: 0, Decision: "APPROVED"}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}
		if err := (domain.TransactionDecisionCommand{TransactionID: 1, Decision: "MAYBE"}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}
	})

	t.Run("CreateCompostBatchCommand & CreateWasteLogCommand", func(t *testing.T) {
		if err := (domain.CreateCompostBatchCommand{UserID: 1, BatchCode: "B-01"}).Validate(); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if err := (domain.CreateCompostBatchCommand{UserID: 0, BatchCode: "B-01"}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}

		logCmd := domain.CreateWasteLogCommand{UserID: 1, WeightKg: 10, Moisture: "good"}
		if err := logCmd.Validate(); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if got := logCmd.ComputedCarbonSavedKg(); got != 25.3 {
			t.Fatalf("ComputedCarbonSavedKg = %v, want 25.3", got)
		}
		logCustomEF := domain.CreateWasteLogCommand{UserID: 1, WeightKg: 10, Moisture: "dry", EFValue: 1.5}
		if got := logCustomEF.ComputedCarbonSavedKg(); got != 15.0 {
			t.Fatalf("ComputedCarbonSavedKg = %v, want 15.0", got)
		}
		if err := (domain.CreateWasteLogCommand{UserID: 1, WeightKg: 10, Moisture: "invalid"}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}
	})

	t.Run("RecordRecyclePurchaseCommand, RecordMeterReadingCommand & PayWaterInvoiceCommand", func(t *testing.T) {
		if err := (domain.RecordRecyclePurchaseCommand{TransNo: "KP-01", UserID: 1, TotalWeight: 5.5, TotalAmount: 50, TotalPoints: 10}).Validate(); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if err := (domain.RecordRecyclePurchaseCommand{TransNo: "", UserID: 1, TotalWeight: 5}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}

		if err := (domain.RecordMeterReadingCommand{InvoiceNo: "INV-01", MeterID: 1, PeriodID: 1, CurrentMeter: 120}).Validate(); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if err := (domain.RecordMeterReadingCommand{InvoiceNo: "", MeterID: 1, PeriodID: 1, CurrentMeter: 120}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}

		if err := (domain.PayWaterInvoiceCommand{InvoiceID: 1, CashierID: 1}).Validate(); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if err := (domain.PayWaterInvoiceCommand{InvoiceID: 0, CashierID: 1}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}
	})

	t.Run("KioskIngestCommand & VerifyLineWebhookSignature", func(t *testing.T) {
		if err := (domain.KioskIngestCommand{KioskID: 1, WasteCountDelta: 5, Status: "active"}).Validate(); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if err := (domain.KioskIngestCommand{KioskID: 0, WasteCountDelta: 5}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}
		if err := (domain.KioskIngestCommand{KioskID: 1, WasteCountDelta: 1, Status: "broken"}).Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("expected ErrBadRequest, got %v", err)
		}

		body := []byte(`{"events":[{"type":"message"}]}`)
		secret := "my-line-secret"
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write(body)
		validSig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

		if !domain.VerifyLineWebhookSignature(secret, body, validSig) {
			t.Fatalf("expected valid HMAC signature to pass")
		}
		if domain.VerifyLineWebhookSignature(secret, body, "bad-sig") {
			t.Fatalf("expected invalid signature to fail")
		}
	})
}
