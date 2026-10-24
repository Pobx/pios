package domain_test

import (
	"errors"
	"testing"

	"github.com/otp2025/backend-go/internal/domain"
)

func i64(v int64) *int64 { return &v }
func iInt(v int) *int    { return &v }

func TestClaimsResolveOrgScope(t *testing.T) {
	tests := []struct {
		name      string
		claims    domain.Claims
		requested *int64
		wantOrgID *int64
		wantErr   error
	}{
		{
			name:      "super_admin with nil requested org returns nil (all orgs)",
			claims:    domain.Claims{Roles: []string{domain.RoleSuperAdmin}},
			requested: nil,
			wantOrgID: nil,
		},
		{
			name:      "super_admin with requested org=2 returns 2 (stateless switch)",
			claims:    domain.Claims{Roles: []string{domain.RoleSuperAdmin}},
			requested: i64(2),
			wantOrgID: i64(2),
		},
		{
			name:      "admin with org_id=1 and nil requested returns 1",
			claims:    domain.Claims{Roles: []string{domain.RoleAdmin}, OrgID: i64(1)},
			requested: nil,
			wantOrgID: i64(1),
		},
		{
			name:      "admin with org_id=1 requesting own org=1 returns 1",
			claims:    domain.Claims{Roles: []string{domain.RoleAdmin}, OrgID: i64(1)},
			requested: i64(1),
			wantOrgID: i64(1),
		},
		{
			name:      "admin with org_id=1 attempting cross-tenant access org=2 -> ErrForbidden",
			claims:    domain.Claims{Roles: []string{domain.RoleAdmin}, OrgID: i64(1)},
			requested: i64(2),
			wantErr:   domain.ErrForbidden,
		},
		{
			name:      "non-super_admin without org_id -> ErrForbidden",
			claims:    domain.Claims{Roles: []string{domain.RoleAdmin}, OrgID: nil},
			requested: nil,
			wantErr:   domain.ErrForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.claims.ResolveOrgScope(tt.requested)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if tt.wantOrgID == nil && got != nil {
				t.Fatalf("got %v, want nil", *got)
			}
			if tt.wantOrgID != nil && (got == nil || *got != *tt.wantOrgID) {
				t.Fatalf("got %v, want %d", got, *tt.wantOrgID)
			}
		})
	}
}

func TestLineLinkCommandValidate(t *testing.T) {
	valid := domain.LineLinkCommand{
		TargetUserID:     10,
		LineUserID:       "U1234567890abcdef",
		VerificationMode: "staff_code",
		VerificationCode: "CODE-9988",
	}
	if err := valid.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}

	invalidCases := []domain.LineLinkCommand{
		{TargetUserID: 0, LineUserID: "U123456", VerificationMode: "staff_code", VerificationCode: "123"},
		{TargetUserID: 1, LineUserID: "U1", VerificationMode: "staff_code", VerificationCode: "123"},
		{TargetUserID: 1, LineUserID: "U123456", VerificationMode: "unverified_liff", VerificationCode: "123"},
		{TargetUserID: 1, LineUserID: "U123456", VerificationMode: "password", VerificationCode: "   "},
	}
	for i, tc := range invalidCases {
		if err := tc.Validate(); !errors.Is(err, domain.ErrBadRequest) {
			t.Fatalf("case %d: expected ErrBadRequest, got %v", i, err)
		}
	}
}

func TestCalculateProgressiveWaterBill(t *testing.T) {
	tiers := []domain.RateTier{
		{TierOrder: 2, MinUnits: 11, MaxUnits: iInt(20), RatePerUnit: 8.0},
		{TierOrder: 1, MinUnits: 1, MaxUnits: iInt(10), RatePerUnit: 5.0},
		{TierOrder: 3, MinUnits: 21, MaxUnits: nil, RatePerUnit: 12.0},
	}

	t.Run("zero units used charges only reserve fee + VAT", func(t *testing.T) {
		got := domain.CalculateProgressiveWaterBill(0, tiers, 10.0, 7.0)
		if got.WaterCharge != 0 || got.ReserveFee != 10.0 || got.VatAmount != 0.70 || got.TotalPayable != 10.70 {
			t.Fatalf("unexpected zero-usage bill: %+v", got)
		}
	})

	t.Run("progressive multi-tier calculation (25 units = 10*5 + 10*8 + 5*12 = 190)", func(t *testing.T) {
		got := domain.CalculateProgressiveWaterBill(25, tiers, 10.0, 7.0)
		if got.WaterCharge != 190.0 {
			t.Fatalf("WaterCharge = %v, want 190.0", got.WaterCharge)
		}
		if got.ReserveFee != 10.0 {
			t.Fatalf("ReserveFee = %v, want 10.0", got.ReserveFee)
		}
		if got.VatAmount != 14.0 {
			t.Fatalf("VatAmount = %v, want 14.0", got.VatAmount)
		}
		if got.TotalPayable != 214.0 {
			t.Fatalf("TotalPayable = %v, want 214.0", got.TotalPayable)
		}
	})

	t.Run("degenerate tier bandwidth < 0 is clamped safely", func(t *testing.T) {
		badTiers := []domain.RateTier{
			{TierOrder: 1, MinUnits: 1, MaxUnits: iInt(20), RatePerUnit: 5.0},
			{TierOrder: 2, MinUnits: 21, MaxUnits: iInt(10), RatePerUnit: 8.0}, // MaxUnits < prevMax
			{TierOrder: 3, MinUnits: 22, MaxUnits: nil, RatePerUnit: 10.0},
		}
		got := domain.CalculateProgressiveWaterBill(25, badTiers, 0, 0)
		if got.WaterCharge != 150.0 { // 20*5 + 0*8 + 5*10
			t.Fatalf("WaterCharge = %v, want 150.0", got.WaterCharge)
		}
	})
}
