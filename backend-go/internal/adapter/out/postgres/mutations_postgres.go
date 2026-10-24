package postgres

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/otp2025/backend-go/internal/domain"
)

// ---- Wave 1.5: Resident Overview --------------------------------------------

const (
	findUserByUsernameSQL = `
SELECT id, org_id
FROM users
WHERE (LOWER(username) = LOWER($2) OR ('user_' || id::text) = LOWER($2))
  AND ($1::bigint IS NULL OR org_id = $1)
ORDER BY id
LIMIT 1
`
	listUserMetersSQL = `
SELECT meter_id,
       COALESCE(org_id, 0),
       COALESCE(user_id, 0),
       COALESCE(meternumber, ''),
       COALESCE(submeter_name, ''),
       COALESCE(meter_address, ''),
       COALESCE(undertake_zone_id, 0),
       COALESCE(undertake_subzone_id, 0),
       COALESCE(status, ''),
       COALESCE(owe_count, 0),
       COALESCE(cutmeter, ''),
       COALESCE(last_meter_recording, 0)
FROM tw_meter_infos
WHERE user_id = $1
ORDER BY meter_id
`
	listUserInvoicesSQL = `
SELECT inv.id,
       COALESCE(inv.inv_no, ''),
       COALESCE(inv.org_id, 0),
       COALESCE(inv.meter_id_fk, 0),
       COALESCE(inv.inv_period_id_fk, 0),
       COALESCE(p.inv_p_name, ''),
       COALESCE(inv.lastmeter, 0)::float8,
       COALESCE(inv.currentmeter, 0)::float8,
       COALESCE(inv.water_used, 0)::float8,
       COALESCE(inv.paid, 0)::float8,
       COALESCE(inv.reserve_meter, 0)::float8,
       COALESCE(inv.vat, 0)::float8,
       COALESCE(inv.totalpaid, 0)::float8,
       COALESCE(inv.status, '')
FROM tw_invoice inv
JOIN tw_meter_infos m ON m.meter_id = inv.meter_id_fk
LEFT JOIN invoice_period p ON p.id = inv.inv_period_id_fk
WHERE m.user_id = $1
ORDER BY inv.id DESC
LIMIT 20
`
	listUserBankAccountsSQL = `
SELECT id,
       COALESCE(org_id, 0),
       COALESCE(user_id, 0),
       COALESCE(entity_type, ''),
       COALESCE(account_no, ''),
       COALESCE(balance, 0)::float8,
       COALESCE(points, 0),
       COALESCE(status, '')
FROM kp_bank_accounts
WHERE user_id = $1
ORDER BY id
`
)

func (s *Store) GetResidentOverview(ctx context.Context, orgID *int64, username string) (domain.ResidentOverview, error) {
	ov := domain.ResidentOverview{
		Username:     username,
		OrgID:        orgID,
		WaterMeters:  []domain.WaterMeter{},
		Invoices:     []domain.WaterInvoice{},
		BankAccounts: []domain.BankAccountSummary{},
	}

	var userID int64
	var dbOrgID *int64
	err := s.db.QueryRow(ctx, findUserByUsernameSQL, orgID, username).Scan(&userID, &dbOrgID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ov, nil
	}
	if err != nil {
		return domain.ResidentOverview{}, fmt.Errorf("find user by username: %w", err)
	}
	if dbOrgID != nil {
		ov.OrgID = dbOrgID
	}

	mRows, err := s.db.Query(ctx, listUserMetersSQL, userID)
	if err != nil {
		return domain.ResidentOverview{}, fmt.Errorf("query resident meters: %w", err)
	}
	defer mRows.Close()
	for mRows.Next() {
		var m domain.WaterMeter
		if err := mRows.Scan(
			&m.MeterID, &m.OrgID, &m.UserID, &m.MeterNumber, &m.SubmeterName, &m.MeterAddress,
			&m.UndertakeZoneID, &m.UndertakeSubzoneID, &m.Status, &m.OweCount, &m.CutMeter, &m.LastMeterRecording,
		); err != nil {
			return domain.ResidentOverview{}, fmt.Errorf("scan resident meter: %w", err)
		}
		ov.WaterMeters = append(ov.WaterMeters, m)
	}
	if err := mRows.Err(); err != nil {
		return domain.ResidentOverview{}, err
	}

	iRows, err := s.db.Query(ctx, listUserInvoicesSQL, userID)
	if err != nil {
		return domain.ResidentOverview{}, fmt.Errorf("query resident invoices: %w", err)
	}
	defer iRows.Close()
	for iRows.Next() {
		var inv domain.WaterInvoice
		if err := iRows.Scan(
			&inv.ID, &inv.InvoiceNo, &inv.OrgID, &inv.MeterID, &inv.PeriodID, &inv.PeriodName,
			&inv.LastMeter, &inv.CurrentMeter, &inv.WaterUsed, &inv.Paid, &inv.ReserveMeter,
			&inv.Vat, &inv.TotalPaid, &inv.Status,
		); err != nil {
			return domain.ResidentOverview{}, fmt.Errorf("scan resident invoice: %w", err)
		}
		ov.Invoices = append(ov.Invoices, inv)
	}
	if err := iRows.Err(); err != nil {
		return domain.ResidentOverview{}, err
	}

	aRows, err := s.db.Query(ctx, listUserBankAccountsSQL, userID)
	if err != nil {
		return domain.ResidentOverview{}, fmt.Errorf("query resident bank accounts: %w", err)
	}
	defer aRows.Close()
	for aRows.Next() {
		var acc domain.BankAccountSummary
		if err := aRows.Scan(
			&acc.ID, &acc.OrgID, &acc.UserID, &acc.EntityType, &acc.AccountNo,
			&acc.Balance, &acc.Points, &acc.Status,
		); err != nil {
			return domain.ResidentOverview{}, fmt.Errorf("scan resident bank account: %w", err)
		}
		ov.BankAccounts = append(ov.BankAccounts, acc)
	}
	if err := aRows.Err(); err != nil {
		return domain.ResidentOverview{}, err
	}

	return ov, nil
}

// ---- Wave 2: Inventory Mutations --------------------------------------------

const createInventoryItemSQL = `
INSERT INTO inv_items (
    org_id, inv_category_id_fk, code, name, unit, min_stock, item_type, is_chemical, return_required, created_at, updated_at
) VALUES (
    $1, NULLIF($2, 0), $3, $4, $5, $6, COALESCE(NULLIF($7, ''), 'GENERAL'), $8, $9, NOW(), NOW()
)
RETURNING id, org_id, COALESCE(inv_category_id_fk, 0), '' AS category_name,
          COALESCE(code, ''), COALESCE(name, ''), COALESCE(unit, ''),
          COALESCE(min_stock, 0), COALESCE(item_type, ''),
          COALESCE(is_chemical, false), COALESCE(return_required, false)
`

func (s *Store) CreateItem(ctx context.Context, orgID int64, cmd domain.CreateInventoryItemCommand) (domain.InventoryItem, error) {
	var item domain.InventoryItem
	err := s.db.QueryRow(
		ctx, createInventoryItemSQL,
		orgID, cmd.CategoryID, strings.TrimSpace(cmd.Code), strings.TrimSpace(cmd.Name),
		strings.TrimSpace(cmd.Unit), cmd.MinStock, strings.TrimSpace(cmd.ItemType),
		cmd.IsChemical, cmd.ReturnRequired,
	).Scan(
		&item.ID, &item.OrgID, &item.CategoryID, &item.CategoryName,
		&item.Code, &item.Name, &item.Unit, &item.MinStock,
		&item.ItemType, &item.IsChemical, &item.ReturnRequired,
	)
	if err != nil {
		return domain.InventoryItem{}, fmt.Errorf("insert inventory item: %w", err)
	}
	return item, nil
}

const createInventoryTransactionSQL = `
INSERT INTO inv_transactions (
    org_id, ref_no, inv_item_id_fk, requester_id_fk, quantity, purpose, status, current_step, transaction_date, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, 'PENDING', 1, NOW(), NOW(), NOW()
)
RETURNING id, org_id, COALESCE(ref_no, ''), inv_item_id_fk, '' AS item_name,
          requester_id_fk, COALESCE(quantity, 0), COALESCE(purpose, ''),
          COALESCE(status, ''), COALESCE(current_step, 1)
`

func (s *Store) CreateTransaction(ctx context.Context, orgID int64, cmd domain.CreateInventoryTransactionCommand) (domain.InventoryTransaction, error) {
	var tx domain.InventoryTransaction
	err := s.db.QueryRow(
		ctx, createInventoryTransactionSQL,
		orgID, strings.TrimSpace(cmd.RefNo), cmd.ItemID, cmd.RequesterID, cmd.Quantity, strings.TrimSpace(cmd.Purpose),
	).Scan(
		&tx.ID, &tx.OrgID, &tx.RefNo, &tx.ItemID, &tx.ItemName,
		&tx.RequesterID, &tx.Quantity, &tx.Purpose, &tx.Status, &tx.CurrentStep,
	)
	if err != nil {
		return domain.InventoryTransaction{}, fmt.Errorf("insert inventory transaction: %w", err)
	}
	return tx, nil
}

const decideInventoryTransactionSQL = `
UPDATE inv_transactions
SET status = $3, updated_at = NOW()
WHERE id = $2 AND ($1::bigint IS NULL OR org_id = $1)
RETURNING id, org_id, COALESCE(ref_no, ''), inv_item_id_fk, '' AS item_name,
          requester_id_fk, COALESCE(quantity, 0), COALESCE(purpose, ''),
          COALESCE(status, ''), COALESCE(current_step, 1)
`

func (s *Store) DecideTransaction(ctx context.Context, orgID *int64, cmd domain.TransactionDecisionCommand) (domain.InventoryTransaction, error) {
	var tx domain.InventoryTransaction
	err := s.db.QueryRow(ctx, decideInventoryTransactionSQL, orgID, cmd.TransactionID, cmd.Decision).Scan(
		&tx.ID, &tx.OrgID, &tx.RefNo, &tx.ItemID, &tx.ItemName,
		&tx.RequesterID, &tx.Quantity, &tx.Purpose, &tx.Status, &tx.CurrentStep,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.InventoryTransaction{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.InventoryTransaction{}, fmt.Errorf("decide inventory transaction: %w", err)
	}
	return tx, nil
}

// ---- Wave 3: FoodWaste Mutations --------------------------------------------

const createCompostBatchSQL = `
INSERT INTO foodwaste_compost_batches (
    user_id, batch_code, start_date, status, created_at, updated_at
) VALUES (
    $1, $2, COALESCE(NULLIF($3, '')::date, CURRENT_DATE), 'filling', NOW(), NOW()
)
RETURNING id, user_id, COALESCE(batch_code, ''), COALESCE(status, ''), COALESCE(start_date::text, ''), COALESCE(closed_date::text, '')
`

func (s *Store) CreateCompostBatch(ctx context.Context, cmd domain.CreateCompostBatchCommand) (domain.CompostBatch, error) {
	var b domain.CompostBatch
	err := s.db.QueryRow(ctx, createCompostBatchSQL, cmd.UserID, strings.TrimSpace(cmd.BatchCode), strings.TrimSpace(cmd.StartDate)).Scan(
		&b.ID, &b.UserID, &b.BatchCode, &b.Status, &b.StartDate, &b.ClosedDate,
	)
	if err != nil {
		return domain.CompostBatch{}, fmt.Errorf("insert compost batch: %w", err)
	}
	return b, nil
}

const createWasteLogSQL = `
INSERT INTO foodwaste_waste_logs (
    batch_id, user_id, weight_kg, estimated_weight, moisture, carbon_saved_kg, is_mixed, is_verified, created_at, updated_at
) VALUES (
    $1, $2, $3, $3, $4, $5, false, true, NOW(), NOW()
)
RETURNING id, batch_id, user_id, weight_kg::float8, moisture, carbon_saved_kg::float8
`

func (s *Store) CreateWasteLog(ctx context.Context, cmd domain.CreateWasteLogCommand) (domain.WasteLogEntry, error) {
	var entry domain.WasteLogEntry
	carbonSaved := cmd.ComputedCarbonSavedKg()
	err := s.db.QueryRow(ctx, createWasteLogSQL, cmd.BatchID, cmd.UserID, cmd.WeightKg, cmd.Moisture, carbonSaved).Scan(
		&entry.ID, &entry.BatchID, &entry.UserID, &entry.WeightKg, &entry.Moisture, &entry.CarbonSavedKg,
	)
	if err != nil {
		return domain.WasteLogEntry{}, fmt.Errorf("insert waste log: %w", err)
	}
	return entry, nil
}

// ---- Wave 4: KeptKaya / Recycle Bank Accounts & Purchases -------------------

const listBankAccountsSQL = `
SELECT id,
       COALESCE(org_id, 0),
       COALESCE(user_id, 0),
       COALESCE(entity_type, ''),
       COALESCE(account_no, ''),
       COALESCE(balance, 0)::float8,
       COALESCE(points, 0),
       COALESCE(status, '')
FROM kp_bank_accounts
WHERE ($1::bigint IS NULL OR org_id = $1)
ORDER BY id
`

func (s *Store) ListBankAccounts(ctx context.Context, orgID *int64) ([]domain.BankAccountSummary, error) {
	rows, err := s.db.Query(ctx, listBankAccountsSQL, orgID)
	if err != nil {
		return nil, fmt.Errorf("query bank accounts: %w", err)
	}
	defer rows.Close()

	out := []domain.BankAccountSummary{}
	for rows.Next() {
		var acc domain.BankAccountSummary
		if err := rows.Scan(
			&acc.ID, &acc.OrgID, &acc.UserID, &acc.EntityType, &acc.AccountNo,
			&acc.Balance, &acc.Points, &acc.Status,
		); err != nil {
			return nil, fmt.Errorf("scan bank account: %w", err)
		}
		out = append(out, acc)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate bank accounts: %w", err)
	}
	return out, nil
}

const recordRecyclePurchaseSQL = `
WITH ins AS (
    INSERT INTO kp_purchase_transactions (
        org_id, kp_u_trans_no, user_id, transaction_date,
        total_weight, total_amount, total_points, total_carbon_saved,
        cash_back, status, deleted, created_at, updated_at
    ) VALUES (
        $1, $2, $3, CURRENT_DATE, $4, $5, $6, 0, 0, 'completed', 0, NOW(), NOW()
    )
    RETURNING id, COALESCE(org_id, 0) AS org_id, kp_u_trans_no, user_id,
              total_weight::float8 AS total_weight, total_amount::float8 AS total_amount,
              total_points, status
), upd_acc AS (
    UPDATE kp_bank_accounts
    SET balance = balance + $5, points = points + $6, updated_at = NOW()
    WHERE user_id = $3 AND org_id = $1
)
SELECT id, org_id, kp_u_trans_no, user_id, total_weight, total_amount, total_points, status
FROM ins
`

func (s *Store) RecordPurchase(ctx context.Context, orgID int64, cmd domain.RecordRecyclePurchaseCommand) (domain.RecyclePurchaseTransaction, error) {
	var tx domain.RecyclePurchaseTransaction
	err := s.db.QueryRow(
		ctx, recordRecyclePurchaseSQL,
		orgID, strings.TrimSpace(cmd.TransNo), cmd.UserID, cmd.TotalWeight, cmd.TotalAmount, cmd.TotalPoints,
	).Scan(
		&tx.ID, &tx.OrgID, &tx.TransNo, &tx.UserID, &tx.TotalWeight, &tx.TotalAmount, &tx.TotalPoints, &tx.Status,
	)
	if err != nil {
		return domain.RecyclePurchaseTransaction{}, fmt.Errorf("record recycle purchase: %w", err)
	}
	return tx, nil
}

// ---- Wave 5: Tabwater Meter Reading & Invoice Payment -----------------------

const (
	getMeterLastReadingSQL = `
SELECT COALESCE(last_meter_recording, 0)::float8
FROM tw_meter_infos
WHERE meter_id = $2 AND ($1::bigint IS NULL OR org_id = $1)
`
	listRateTiersSQL = `
SELECT tier_order, min_units, max_units, COALESCE(rate_per_unit, 0)::float8
FROM tw_meter_type_rate_tiers
ORDER BY tier_order
`
	insertMeterInvoiceAndUpdateMeterSQL = `
WITH ins_inv AS (
    INSERT INTO tw_invoice (
        inv_no, org_id, meter_id_fk, inv_period_id_fk,
        lastmeter, currentmeter, water_used, inv_type,
        paid, reserve_meter, vat, totalpaid, previous_balance,
        status, created_at, updated_at
    ) VALUES (
        $2, $1, $3, $4,
        $5, $6, $7, 'r',
        $8, $9, $10, $11, 0,
        'invoice', NOW(), NOW()
    )
    RETURNING id, COALESCE(inv_no, '') AS inv_no, COALESCE(org_id, 0) AS org_id,
              meter_id_fk, inv_period_id_fk, lastmeter::float8, currentmeter::float8,
              water_used::float8, paid::float8, reserve_meter::float8, vat::float8,
              totalpaid::float8, status
), upd_meter AS (
    UPDATE tw_meter_infos
    SET last_meter_recording = $12, updated_at = NOW()
    WHERE meter_id = $3
)
SELECT id, inv_no, org_id, meter_id_fk, inv_period_id_fk, '' AS period_name,
       lastmeter, currentmeter, water_used, paid, reserve_meter, vat, totalpaid, status
FROM ins_inv
`
)

func (s *Store) RecordMeterReading(ctx context.Context, orgID int64, cmd domain.RecordMeterReadingCommand) (domain.WaterInvoice, error) {
	var lastReading float64
	err := s.db.QueryRow(ctx, getMeterLastReadingSQL, &orgID, cmd.MeterID).Scan(&lastReading)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.WaterInvoice{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.WaterInvoice{}, fmt.Errorf("get meter last reading: %w", err)
	}

	tRows, err := s.db.Query(ctx, listRateTiersSQL)
	if err != nil {
		return domain.WaterInvoice{}, fmt.Errorf("query rate tiers: %w", err)
	}
	defer tRows.Close()
	tiers := []domain.RateTier{}
	for tRows.Next() {
		var rt domain.RateTier
		if err := tRows.Scan(&rt.TierOrder, &rt.MinUnits, &rt.MaxUnits, &rt.RatePerUnit); err != nil {
			return domain.WaterInvoice{}, fmt.Errorf("scan rate tier: %w", err)
		}
		tiers = append(tiers, rt)
	}
	if err := tRows.Err(); err != nil {
		return domain.WaterInvoice{}, err
	}
	if len(tiers) == 0 {
		tiers = []domain.RateTier{{TierOrder: 1, MinUnits: 1, RatePerUnit: 7.0}}
	}

	unitsUsed := math.Max(0, cmd.CurrentMeter-lastReading)
	vatPct := cmd.VatPercent
	if vatPct <= 0 {
		vatPct = 7.0
	}
	bill := domain.CalculateProgressiveWaterBill(unitsUsed, tiers, cmd.ReserveFee, vatPct)

	var inv domain.WaterInvoice
	err = s.db.QueryRow(
		ctx, insertMeterInvoiceAndUpdateMeterSQL,
		orgID, strings.TrimSpace(cmd.InvoiceNo), cmd.MeterID, cmd.PeriodID,
		lastReading, cmd.CurrentMeter, bill.UnitsUsed,
		bill.WaterCharge, bill.ReserveFee, bill.VatAmount, bill.TotalPayable,
		int(math.Round(cmd.CurrentMeter)),
	).Scan(
		&inv.ID, &inv.InvoiceNo, &inv.OrgID, &inv.MeterID, &inv.PeriodID, &inv.PeriodName,
		&inv.LastMeter, &inv.CurrentMeter, &inv.WaterUsed, &inv.Paid, &inv.ReserveMeter,
		&inv.Vat, &inv.TotalPaid, &inv.Status,
	)
	if err != nil {
		return domain.WaterInvoice{}, fmt.Errorf("insert meter reading invoice: %w", err)
	}
	return inv, nil
}

const payWaterInvoiceSQL = `
WITH target AS (
    SELECT id, COALESCE(org_id, 1) AS org_id, meter_id_fk, paid, vat, reserve_meter, totalpaid
    FROM tw_invoice
    WHERE id = $2 AND ($1::bigint IS NULL OR org_id = $1)
), ins_acc AS (
    INSERT INTO tw_acc_transactions (
        org_id, meter_id_fk, paidsum, vatsum, reserve_meter_sum, totalpaidsum, status, cashier, created_at, updated_at
    )
    SELECT org_id, meter_id_fk, paid, vat, reserve_meter, totalpaid, '1', $3, NOW(), NOW()
    FROM target
    RETURNING id
), upd_inv AS (
    UPDATE tw_invoice inv
    SET status = 'paid', acc_trans_id_fk = ins_acc.id, updated_at = NOW()
    FROM ins_acc
    WHERE inv.id = $2 AND ($1::bigint IS NULL OR inv.org_id = $1)
    RETURNING inv.id, COALESCE(inv.inv_no, '') AS inv_no, COALESCE(inv.org_id, 0) AS org_id,
              COALESCE(inv.meter_id_fk, 0) AS meter_id_fk, COALESCE(inv.inv_period_id_fk, 0) AS inv_period_id_fk,
              COALESCE(inv.lastmeter, 0)::float8 AS lastmeter, COALESCE(inv.currentmeter, 0)::float8 AS currentmeter,
              COALESCE(inv.water_used, 0)::float8 AS water_used, COALESCE(inv.paid, 0)::float8 AS paid,
              COALESCE(inv.reserve_meter, 0)::float8 AS reserve_meter, COALESCE(inv.vat, 0)::float8 AS vat,
              COALESCE(inv.totalpaid, 0)::float8 AS totalpaid, COALESCE(inv.status, '') AS status
)
SELECT id, inv_no, org_id, meter_id_fk, inv_period_id_fk, '' AS period_name,
       lastmeter, currentmeter, water_used, paid, reserve_meter, vat, totalpaid, status
FROM upd_inv
`

func (s *Store) PayInvoice(ctx context.Context, orgID *int64, cmd domain.PayWaterInvoiceCommand) (domain.WaterInvoice, error) {
	var inv domain.WaterInvoice
	err := s.db.QueryRow(ctx, payWaterInvoiceSQL, orgID, cmd.InvoiceID, cmd.CashierID).Scan(
		&inv.ID, &inv.InvoiceNo, &inv.OrgID, &inv.MeterID, &inv.PeriodID, &inv.PeriodName,
		&inv.LastMeter, &inv.CurrentMeter, &inv.WaterUsed, &inv.Paid, &inv.ReserveMeter,
		&inv.Vat, &inv.TotalPaid, &inv.Status,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.WaterInvoice{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.WaterInvoice{}, fmt.Errorf("pay water invoice: %w", err)
	}
	return inv, nil
}

// ---- Wave 6: IoT Smart Kiosk Telemetry Ingest -------------------------------

const ingestKioskTelemetrySQL = `
UPDATE kiosks
SET total_waste_count = total_waste_count + $3,
    status            = COALESCE(NULLIF($4, ''), status),
    last_online_at    = NOW(),
    updated_at        = NOW()
WHERE id = $2 AND ($1::bigint IS NULL OR org_id = $1 OR org_id IS NULL)
RETURNING id, COALESCE(org_id, 0), COALESCE(name, ''), COALESCE(lat, 0)::float8, COALESCE(lng, 0)::float8, COALESCE(status, 'offline'), COALESCE(total_waste_count, 0)
`

func (s *Store) IngestKioskTelemetry(ctx context.Context, orgID *int64, cmd domain.KioskIngestCommand) (domain.KioskSummary, error) {
	var k domain.KioskSummary
	err := s.db.QueryRow(
		ctx, ingestKioskTelemetrySQL,
		orgID, cmd.KioskID, cmd.WasteCountDelta, cmd.Status,
	).Scan(&k.ID, &k.OrgID, &k.Name, &k.Lat, &k.Lng, &k.Status, &k.TotalWasteCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.KioskSummary{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.KioskSummary{}, fmt.Errorf("ingest kiosk telemetry: %w", err)
	}
	return k, nil
}

// ---- Self-Sufficiency Master Data & Monthly Operational Queries -------------

const (
	createUserSQL = `
INSERT INTO users (
    org_id, username, prefix, firstname, lastname, phone, address,
    zone_id, subzone_id, tambon_code, district_code, province_code,
    age, weight, height, status, old_id, created_at, updated_at
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    COALESCE(NULLIF($8::bigint, 0), (SELECT id FROM zones WHERE org_id = $1 ORDER BY id LIMIT 1), 1),
    COALESCE(NULLIF($9::bigint, 0), (SELECT id FROM subzones ORDER BY id LIMIT 1), 1),
    COALESCE((SELECT tambon_code FROM users ORDER BY id LIMIT 1), 350805),
    COALESCE((SELECT district_code FROM users ORDER BY id LIMIT 1), 3508),
    COALESCE((SELECT province_code FROM users ORDER BY id LIMIT 1), 35),
    0, 0, 0, 'active', 0, NOW(), NOW()
)
RETURNING id, org_id, COALESCE(username, ''), COALESCE(prefix, ''), COALESCE(firstname, ''), COALESCE(lastname, ''), COALESCE(email, ''), COALESCE(phone, ''), COALESCE(address, ''), zone_id, subzone_id, COALESCE(line_user_id, ''), COALESCE(status, 'active')
`
	createZoneSQL = `
INSERT INTO zones (
    org_id, zone_name, location, status, tambon_id, lat, long, created_at, updated_at
)
VALUES (
    $1,
    $2,
    $3,
    'active',
    COALESCE((SELECT tambon_id FROM zones ORDER BY id LIMIT 1), 350805),
    '15.8000',
    '104.1000',
    NOW(),
    NOW()
)
RETURNING id, org_id, COALESCE(zone_name, ''), COALESCE(status, 'active')
`
	withdrawMemberBalanceSQL = `
WITH updated_acc AS (
    UPDATE kp_bank_accounts
    SET balance    = balance - $3,
        updated_at = NOW()
    WHERE id = $2
      AND ($1::bigint IS NULL OR org_id = $1)
      AND balance >= $3
    RETURNING id, COALESCE(org_id, 0) AS org_id, user_id, COALESCE(entity_type, '') AS entity_type, COALESCE(account_no, '') AS account_no, COALESCE(balance, 0)::float8 AS balance, COALESCE(points, 0) AS points, COALESCE(status, 'active') AS status
),
inserted_req AS (
    INSERT INTO kp_money_requests (
        user_id, org_id, amount, verification_code, status, hold_status, is_proxy, payout_method, payout_note, payout_date, completed_at, created_at, updated_at
    )
    SELECT user_id, org_id, $3, 'WD0001', 'completed', 'settled', false, $4, $5, CURRENT_DATE, NOW(), NOW(), NOW()
    FROM updated_acc
)
SELECT id, org_id, user_id, entity_type, account_no, balance, points, status
FROM updated_acc
`
	setRecycleItemPriceSQL = `
WITH inserted_pp AS (
    INSERT INTO kp_tbank_items_pricepoint (
        org_id, kp_items_idfk, price_from_dealer, price_for_member, point, type, kp_units_idfk, effective_date, status, deleted, created_at, updated_at
    )
    VALUES (
        $1, $2, $3, $4, $5, 'tbank',
        COALESCE((SELECT id FROM kp_tbank_items_units ORDER BY id LIMIT 1), 1),
        CURRENT_DATE, 'active', '0', NOW(), NOW()
    )
    RETURNING kp_items_idfk, price_from_dealer, price_for_member, point
)
SELECT i.id,
       COALESCE(i.org_id, 0),
       COALESCE(i.kp_itemscode, ''),
       COALESCE(i.kp_itemsname, ''),
       COALESCE(i.kp_items_group_idfk, 0),
       COALESCE(g.kp_items_groupname, ''),
       COALESCE(i.status, 'active'),
       pp.price_from_dealer::float8,
       pp.price_for_member::float8,
       pp.point::float8
FROM kp_tbank_items i
JOIN inserted_pp pp ON pp.kp_items_idfk = i.id
LEFT JOIN kp_tbank_items_groups g ON g.id = i.kp_items_group_idfk
WHERE i.id = $2
`
	listPeriodsSQL = `
SELECT id,
       COALESCE(org_id, 0),
       COALESCE(inv_p_name, ''),
       COALESCE(startdate::text, ''),
       COALESCE(enddate::text, ''),
       COALESCE(status, 'active')
FROM invoice_period
WHERE ($1::bigint IS NULL OR org_id = $1 OR org_id IS NULL)
ORDER BY id DESC
LIMIT 50
`
	createPeriodSQL = `
INSERT INTO invoice_period (
    org_id, inv_p_name, inv_p_name_int, budgetyear_id, startdate, enddate, status, created_at, updated_at
)
VALUES (
    $1,
    $2,
    $2,
    COALESCE((SELECT id FROM budget_year ORDER BY id DESC LIMIT 1), 1),
    COALESCE(NULLIF($3, '')::date, CURRENT_DATE),
    COALESCE(NULLIF($4, '')::date, (CURRENT_DATE + INTERVAL '30 days')::date),
    'active',
    NOW(),
    NOW()
)
RETURNING id, COALESCE(org_id, 0), COALESCE(inv_p_name, ''), COALESCE(startdate::text, ''), COALESCE(enddate::text, ''), COALESCE(status, 'active')
`
	createMeterSQL = `
INSERT INTO tw_meter_infos (
    meter_id, org_id, user_id, meternumber, factory_no, submeter_name, meter_address,
    undertake_zone_id, undertake_subzone_id, acceptance_date, status, owe_count, cutmeter,
    payment_id, last_meter_recording, old_meter_id, created_at, updated_at
)
VALUES (
    COALESCE((SELECT MAX(meter_id) FROM tw_meter_infos), 0) + 1,
    $1,
    $2,
    $3,
    $3,
    $4,
    $5,
    COALESCE(NULLIF($6::bigint, 0), (SELECT id FROM zones WHERE org_id = $1 ORDER BY id LIMIT 1), 1),
    COALESCE(NULLIF($7::bigint, 0), (SELECT id FROM subzones ORDER BY id LIMIT 1), 1),
    CURRENT_DATE,
    'active',
    0,
    '0',
    1,
    $8,
    0,
    NOW(),
    NOW()
)
RETURNING meter_id, COALESCE(org_id, 0), COALESCE(user_id, 0), COALESCE(meternumber, ''), COALESCE(submeter_name, ''), COALESCE(meter_address, ''), COALESCE(undertake_zone_id, 0), COALESCE(undertake_subzone_id, 0), COALESCE(status, 'active'), COALESCE(owe_count, 0), COALESCE(cutmeter, '0'), COALESCE(last_meter_recording, 0)
`
)

func (s *Store) CreateUser(ctx context.Context, orgID int64, cmd domain.CreateUserCommand) (domain.UserSummary, error) {
	var u domain.UserSummary
	err := s.db.QueryRow(
		ctx, createUserSQL,
		orgID, strings.TrimSpace(cmd.Username), strings.TrimSpace(cmd.Prefix),
		strings.TrimSpace(cmd.FirstName), strings.TrimSpace(cmd.LastName),
		strings.TrimSpace(cmd.Phone), strings.TrimSpace(cmd.Address),
		cmd.ZoneID, cmd.SubzoneID,
	).Scan(
		&u.ID, &u.OrgID, &u.Username, &u.Prefix, &u.FirstName, &u.LastName,
		&u.Email, &u.Phone, &u.Address, &u.ZoneID, &u.SubzoneID, &u.LineUserID, &u.Status,
	)
	if err != nil {
		return domain.UserSummary{}, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

func (s *Store) CreateZone(ctx context.Context, orgID int64, cmd domain.CreateZoneCommand) (domain.Zone, error) {
	var z domain.Zone
	z.Subzones = []domain.Subzone{}
	loc := strings.TrimSpace(cmd.Location)
	if loc == "" {
		loc = strings.TrimSpace(cmd.ZoneName)
	}
	err := s.db.QueryRow(ctx, createZoneSQL, orgID, strings.TrimSpace(cmd.ZoneName), loc).Scan(
		&z.ID, &z.OrgID, &z.Name, &z.Status,
	)
	if err != nil {
		return domain.Zone{}, fmt.Errorf("create zone: %w", err)
	}
	return z, nil
}

func (s *Store) WithdrawMemberBalance(ctx context.Context, orgID int64, cmd domain.CreateRecycleWithdrawalCommand) (domain.BankAccountSummary, error) {
	var acc domain.BankAccountSummary
	err := s.db.QueryRow(
		ctx, withdrawMemberBalanceSQL,
		orgID, cmd.AccountID, cmd.Amount, cmd.PayoutMethod, strings.TrimSpace(cmd.Note),
	).Scan(
		&acc.ID, &acc.OrgID, &acc.UserID, &acc.EntityType, &acc.AccountNo, &acc.Balance, &acc.Points, &acc.Status,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.BankAccountSummary{}, domain.ErrBadRequest
	}
	if err != nil {
		return domain.BankAccountSummary{}, fmt.Errorf("withdraw member balance: %w", err)
	}
	return acc, nil
}

func (s *Store) SetRecycleItemPrice(ctx context.Context, orgID int64, cmd domain.SetRecycleItemPriceCommand) (domain.RecycleItem, error) {
	var item domain.RecycleItem
	err := s.db.QueryRow(
		ctx, setRecycleItemPriceSQL,
		orgID, cmd.ItemID, cmd.PriceFromDealer, cmd.PriceForMember, cmd.Point,
	).Scan(
		&item.ID, &item.OrgID, &item.Code, &item.Name, &item.GroupID, &item.GroupName,
		&item.Status, &item.PriceFromDealer, &item.PriceForMember, &item.Point,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.RecycleItem{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.RecycleItem{}, fmt.Errorf("set recycle item price: %w", err)
	}
	return item, nil
}

func (s *Store) ListPeriods(ctx context.Context, orgID *int64) ([]domain.InvoicePeriod, error) {
	rows, err := s.db.Query(ctx, listPeriodsSQL, orgID)
	if err != nil {
		return nil, fmt.Errorf("query invoice periods: %w", err)
	}
	defer rows.Close()

	out := []domain.InvoicePeriod{}
	for rows.Next() {
		var p domain.InvoicePeriod
		if err := rows.Scan(&p.ID, &p.OrgID, &p.PeriodName, &p.StartDate, &p.EndDate, &p.Status); err != nil {
			return nil, fmt.Errorf("scan invoice period: %w", err)
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate invoice periods: %w", err)
	}
	return out, nil
}

func (s *Store) CreatePeriod(ctx context.Context, orgID int64, cmd domain.CreateInvoicePeriodCommand) (domain.InvoicePeriod, error) {
	var p domain.InvoicePeriod
	err := s.db.QueryRow(
		ctx, createPeriodSQL,
		orgID, strings.TrimSpace(cmd.PeriodName), strings.TrimSpace(cmd.StartDate), strings.TrimSpace(cmd.EndDate),
	).Scan(&p.ID, &p.OrgID, &p.PeriodName, &p.StartDate, &p.EndDate, &p.Status)
	if err != nil {
		return domain.InvoicePeriod{}, fmt.Errorf("create invoice period: %w", err)
	}
	return p, nil
}

func (s *Store) CreateMeter(ctx context.Context, orgID int64, cmd domain.CreateWaterMeterCommand) (domain.WaterMeter, error) {
	var m domain.WaterMeter
	err := s.db.QueryRow(
		ctx, createMeterSQL,
		orgID, cmd.UserID, strings.TrimSpace(cmd.MeterNumber), strings.TrimSpace(cmd.SubmeterName),
		strings.TrimSpace(cmd.MeterAddress), cmd.ZoneID, cmd.SubzoneID, cmd.InitialReading,
	).Scan(
		&m.MeterID, &m.OrgID, &m.UserID, &m.MeterNumber, &m.SubmeterName, &m.MeterAddress,
		&m.UndertakeZoneID, &m.UndertakeSubzoneID, &m.Status, &m.OweCount, &m.CutMeter, &m.LastMeterRecording,
	)
	if err != nil {
		return domain.WaterMeter{}, fmt.Errorf("create water meter: %w", err)
	}
	return m, nil
}
