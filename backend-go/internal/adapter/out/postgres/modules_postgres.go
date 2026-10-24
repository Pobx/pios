package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/otp2025/backend-go/internal/domain"
)

// ---- Wave 1.5: Identity (Users, Zones, Safe LINE Account Linking) -----------

const listUsersSQL = `
SELECT id, org_id,
       COALESCE(username, ''),
       COALESCE(prefix, ''),
       COALESCE(firstname, ''),
       COALESCE(lastname, ''),
       COALESCE(email, ''),
       COALESCE(phone, ''),
       COALESCE(address, ''),
       zone_id,
       subzone_id,
       COALESCE(line_user_id, ''),
       COALESCE(status, '')
FROM users
WHERE ($1::bigint IS NULL OR org_id = $1)
  AND ($2::text = '' OR username ILIKE '%' || $2 || '%' OR firstname ILIKE '%' || $2 || '%' OR lastname ILIKE '%' || $2 || '%' OR phone ILIKE '%' || $2 || '%')
ORDER BY id
LIMIT $3 OFFSET $4
`

func (s *Store) ListUsers(ctx context.Context, orgID *int64, query string, limit, offset int) ([]domain.UserSummary, error) {
	rows, err := s.db.Query(ctx, listUsersSQL, orgID, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	out := []domain.UserSummary{}
	for rows.Next() {
		var u domain.UserSummary
		if err := rows.Scan(
			&u.ID, &u.OrgID, &u.Username, &u.Prefix, &u.FirstName, &u.LastName,
			&u.Email, &u.Phone, &u.Address, &u.ZoneID, &u.SubzoneID, &u.LineUserID, &u.Status,
		); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		out = append(out, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}
	return out, nil
}

const (
	listZonesSQL = `
SELECT id, org_id, COALESCE(zone_name, ''), COALESCE(status, '')
FROM zones
WHERE ($1::bigint IS NULL OR org_id = $1)
ORDER BY id
`
	listSubzonesSQL = `
SELECT id, org_id, zone_id, COALESCE(subzone_name, ''), COALESCE(status, '')
FROM subzones
WHERE ($1::bigint IS NULL OR org_id = $1)
ORDER BY id
`
)

func (s *Store) ListZones(ctx context.Context, orgID *int64) ([]domain.Zone, error) {
	rows, err := s.db.Query(ctx, listZonesSQL, orgID)
	if err != nil {
		return nil, fmt.Errorf("query zones: %w", err)
	}
	defer rows.Close()

	zones := []domain.Zone{}
	indexByZoneID := map[int64]int{}
	for rows.Next() {
		var z domain.Zone
		z.Subzones = []domain.Subzone{}
		if err := rows.Scan(&z.ID, &z.OrgID, &z.Name, &z.Status); err != nil {
			return nil, fmt.Errorf("scan zone: %w", err)
		}
		indexByZoneID[z.ID] = len(zones)
		zones = append(zones, z)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate zones: %w", err)
	}

	subRows, err := s.db.Query(ctx, listSubzonesSQL, orgID)
	if err != nil {
		return nil, fmt.Errorf("query subzones: %w", err)
	}
	defer subRows.Close()

	for subRows.Next() {
		var sz domain.Subzone
		if err := subRows.Scan(&sz.ID, &sz.OrgID, &sz.ZoneID, &sz.Name, &sz.Status); err != nil {
			return nil, fmt.Errorf("scan subzone: %w", err)
		}
		if idx, ok := indexByZoneID[sz.ZoneID]; ok {
			zones[idx].Subzones = append(zones[idx].Subzones, sz)
		}
	}
	if err := subRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate subzones: %w", err)
	}
	return zones, nil
}

const linkUserLineSQL = `
UPDATE users
SET line_user_id = $3, updated_at = NOW()
WHERE id = $2 AND ($1::bigint IS NULL OR org_id = $1)
RETURNING id, org_id,
          COALESCE(username, ''),
          COALESCE(prefix, ''),
          COALESCE(firstname, ''),
          COALESCE(lastname, ''),
          COALESCE(email, ''),
          COALESCE(phone, ''),
          COALESCE(address, ''),
          zone_id,
          subzone_id,
          COALESCE(line_user_id, ''),
          COALESCE(status, '')
`

func (s *Store) LinkUserLineAccount(ctx context.Context, orgID *int64, userID int64, lineUserID string) (domain.UserSummary, error) {
	var u domain.UserSummary
	err := s.db.QueryRow(ctx, linkUserLineSQL, orgID, userID, lineUserID).Scan(
		&u.ID, &u.OrgID, &u.Username, &u.Prefix, &u.FirstName, &u.LastName,
		&u.Email, &u.Phone, &u.Address, &u.ZoneID, &u.SubzoneID, &u.LineUserID, &u.Status,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.UserSummary{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.UserSummary{}, fmt.Errorf("link user line account: %w", err)
	}
	return u, nil
}

// ---- Wave 2: Inventory Module -----------------------------------------------

const listInventoryItemsSQL = `
SELECT i.id,
       i.org_id,
       i.inv_category_id_fk,
       COALESCE(c.name, ''),
       COALESCE(i.code, ''),
       COALESCE(i.name, ''),
       COALESCE(i.unit, ''),
       COALESCE(i.min_stock, 0),
       COALESCE(i.item_type, ''),
       COALESCE(i.is_chemical, false),
       COALESCE(i.return_required, false)
FROM inv_items i
LEFT JOIN inv_categories c ON c.id = i.inv_category_id_fk
WHERE ($1::bigint IS NULL OR i.org_id = $1)
ORDER BY i.id
`

func (s *Store) ListItems(ctx context.Context, orgID *int64) ([]domain.InventoryItem, error) {
	rows, err := s.db.Query(ctx, listInventoryItemsSQL, orgID)
	if err != nil {
		return nil, fmt.Errorf("query inventory items: %w", err)
	}
	defer rows.Close()

	out := []domain.InventoryItem{}
	for rows.Next() {
		var item domain.InventoryItem
		if err := rows.Scan(
			&item.ID, &item.OrgID, &item.CategoryID, &item.CategoryName,
			&item.Code, &item.Name, &item.Unit, &item.MinStock,
			&item.ItemType, &item.IsChemical, &item.ReturnRequired,
		); err != nil {
			return nil, fmt.Errorf("scan inventory item: %w", err)
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate inventory items: %w", err)
	}
	return out, nil
}

const listInventoryTransactionsSQL = `
SELECT t.id,
       t.org_id,
       COALESCE(t.ref_no, ''),
       t.inv_item_id_fk,
       COALESCE(i.name, ''),
       t.requester_id_fk,
       COALESCE(t.quantity, 0),
       COALESCE(t.purpose, ''),
       COALESCE(t.status, ''),
       COALESCE(t.current_step, 1)
FROM inv_transactions t
LEFT JOIN inv_items i ON i.id = t.inv_item_id_fk
WHERE ($1::bigint IS NULL OR t.org_id = $1)
ORDER BY t.id DESC
`

func (s *Store) ListTransactions(ctx context.Context, orgID *int64) ([]domain.InventoryTransaction, error) {
	rows, err := s.db.Query(ctx, listInventoryTransactionsSQL, orgID)
	if err != nil {
		return nil, fmt.Errorf("query inventory transactions: %w", err)
	}
	defer rows.Close()

	out := []domain.InventoryTransaction{}
	for rows.Next() {
		var tx domain.InventoryTransaction
		if err := rows.Scan(
			&tx.ID, &tx.OrgID, &tx.RefNo, &tx.ItemID, &tx.ItemName,
			&tx.RequesterID, &tx.Quantity, &tx.Purpose, &tx.Status, &tx.CurrentStep,
		); err != nil {
			return nil, fmt.Errorf("scan inventory transaction: %w", err)
		}
		out = append(out, tx)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate inventory transactions: %w", err)
	}
	return out, nil
}

// ---- Wave 3: FoodWaste & Carbon Emission Module -----------------------------

const (
	listCompostBatchesSQL = `
SELECT b.id,
       b.user_id,
       COALESCE(b.batch_code, ''),
       COALESCE(b.status, ''),
       COALESCE(b.start_date::text, ''),
       COALESCE(b.closed_date::text, '')
FROM foodwaste_compost_batches b
LEFT JOIN users u ON u.id = b.user_id
WHERE ($1::bigint IS NULL OR u.org_id = $1 OR u.id IS NULL)
ORDER BY b.id DESC
`
	aggregateWasteLogsSQL = `
SELECT COUNT(*)::int,
       COALESCE(SUM(w.weight_kg), 0)::float8,
       COALESCE(SUM(w.carbon_saved_kg), 0)::float8
FROM foodwaste_waste_logs w
LEFT JOIN users u ON u.id = w.user_id
WHERE ($1::bigint IS NULL OR u.org_id = $1 OR u.id IS NULL)
`
	listEmissionFactorsSQL = `
SELECT id,
       COALESCE(material_name, ''),
       COALESCE(unit, ''),
       COALESCE(ef_value, 0)::float8,
       COALESCE(source, '')
FROM emission_factors
ORDER BY id
`
)

func (s *Store) GetSummary(ctx context.Context, orgID *int64) (domain.FoodWasteSummary, error) {
	var summary domain.FoodWasteSummary
	summary.Batches = []domain.CompostBatch{}
	summary.EmissionFactors = []domain.EmissionFactor{}

	batchRows, err := s.db.Query(ctx, listCompostBatchesSQL, orgID)
	if err != nil {
		return domain.FoodWasteSummary{}, fmt.Errorf("query compost batches: %w", err)
	}
	defer batchRows.Close()

	for batchRows.Next() {
		var b domain.CompostBatch
		if err := batchRows.Scan(&b.ID, &b.UserID, &b.BatchCode, &b.Status, &b.StartDate, &b.ClosedDate); err != nil {
			return domain.FoodWasteSummary{}, fmt.Errorf("scan compost batch: %w", err)
		}
		summary.Batches = append(summary.Batches, b)
	}
	if err := batchRows.Err(); err != nil {
		return domain.FoodWasteSummary{}, fmt.Errorf("iterate compost batches: %w", err)
	}
	summary.TotalBatches = len(summary.Batches)

	if err := s.db.QueryRow(ctx, aggregateWasteLogsSQL, orgID).Scan(
		&summary.TotalWasteLogs, &summary.TotalWeightKg, &summary.TotalCarbonSavedKg,
	); err != nil {
		return domain.FoodWasteSummary{}, fmt.Errorf("aggregate waste logs: %w", err)
	}

	efRows, err := s.db.Query(ctx, listEmissionFactorsSQL)
	if err != nil {
		return domain.FoodWasteSummary{}, fmt.Errorf("query emission factors: %w", err)
	}
	defer efRows.Close()

	for efRows.Next() {
		var ef domain.EmissionFactor
		if err := efRows.Scan(&ef.ID, &ef.MaterialName, &ef.Unit, &ef.EFValue, &ef.Source); err != nil {
			return domain.FoodWasteSummary{}, fmt.Errorf("scan emission factor: %w", err)
		}
		summary.EmissionFactors = append(summary.EmissionFactors, ef)
	}
	if err := efRows.Err(); err != nil {
		return domain.FoodWasteSummary{}, fmt.Errorf("iterate emission factors: %w", err)
	}

	return summary, nil
}

// ---- Wave 4: KeptKaya / Recycle Bank Module ---------------------------------

const listRecycleItemsSQL = `
SELECT i.id,
       COALESCE(i.org_id, 0),
       COALESCE(i.kp_itemscode, ''),
       COALESCE(i.kp_itemsname, ''),
       COALESCE(i.kp_items_group_idfk, 0),
       COALESCE(g.kp_items_groupname, ''),
       COALESCE(i.status, ''),
       COALESCE(p.price_from_dealer, 0)::float8,
       COALESCE(p.price_for_member, 0)::float8,
       COALESCE(p.point, 0)::float8
FROM kp_tbank_items i
LEFT JOIN kp_tbank_items_groups g ON g.id = i.kp_items_group_idfk
LEFT JOIN LATERAL (
    SELECT price_from_dealer, price_for_member, point
    FROM kp_tbank_items_pricepoint pp
    WHERE pp.kp_items_idfk = i.id
    ORDER BY pp.id DESC
    LIMIT 1
) p ON true
WHERE ($1::bigint IS NULL OR i.org_id = $1)
ORDER BY i.id
`

func (s *Store) ListRecycleItems(ctx context.Context, orgID *int64) ([]domain.RecycleItem, error) {
	rows, err := s.db.Query(ctx, listRecycleItemsSQL, orgID)
	if err != nil {
		return nil, fmt.Errorf("query recycle items: %w", err)
	}
	defer rows.Close()

	out := []domain.RecycleItem{}
	for rows.Next() {
		var item domain.RecycleItem
		if err := rows.Scan(
			&item.ID, &item.OrgID, &item.Code, &item.Name, &item.GroupID, &item.GroupName,
			&item.Status, &item.PriceFromDealer, &item.PriceForMember, &item.Point,
		); err != nil {
			return nil, fmt.Errorf("scan recycle item: %w", err)
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recycle items: %w", err)
	}
	return out, nil
}

const (
	listKiosksSQL = `
SELECT id,
       COALESCE(org_id, 0),
       COALESCE(name, ''),
       COALESCE(lat, 0)::float8,
       COALESCE(lng, 0)::float8,
       COALESCE(status, 'offline'),
       COALESCE(total_waste_count, 0)
FROM kiosks
WHERE ($1::bigint IS NULL OR org_id = $1)
ORDER BY id
`
	listWelfareConfigsSQL = `
SELECT id,
       COALESCE(org_id, 0),
       COALESCE(min_months_active, 0),
       COALESCE(min_total_weight, 0),
       COALESCE(default_payout_amount, 0)::float8,
       COALESCE(criteria_description, '')
FROM kp_welfare_configs
WHERE ($1::bigint IS NULL OR org_id = $1)
ORDER BY id
`
	listWelfarePayoutsSQL = `
SELECT id,
       COALESCE(org_id, 0),
       COALESCE(deceased_name, ''),
       COALESCE(beneficiary_name, ''),
       COALESCE(amount, 0)::float8,
       COALESCE(status, 'pending')
FROM kp_welfare_payouts
WHERE ($1::bigint IS NULL OR org_id = $1)
ORDER BY id DESC
LIMIT 50
`
	listAnnualTrashSubsSQL = `
SELECT s.id,
       COALESCE(s.fiscal_year, ''),
       s.user_id,
       COALESCE(s.annual_fee, 0)::float8,
       COALESCE(s.month_fee, 0)::float8,
       COALESCE(s.total_paid_amt, 0)::float8,
       COALESCE(s.status, 'pending')
FROM annual_trash_subscriptions s
LEFT JOIN users u ON u.id = s.user_id
WHERE ($1::bigint IS NULL OR u.org_id = $1 OR u.id IS NULL)
ORDER BY s.id DESC
LIMIT 50
`
)

func (s *Store) GetSubmodulesOverview(ctx context.Context, orgID *int64) (domain.RecycleSubmodulesOverview, error) {
	ov := domain.RecycleSubmodulesOverview{
		Kiosks:                   []domain.KioskSummary{},
		WelfareConfigs:           []domain.WelfareConfig{},
		WelfarePayouts:           []domain.WelfarePayout{},
		AnnualTrashSubscriptions: []domain.AnnualTrashSubscription{},
	}

	kRows, err := s.db.Query(ctx, listKiosksSQL, orgID)
	if err != nil {
		return domain.RecycleSubmodulesOverview{}, fmt.Errorf("query kiosks: %w", err)
	}
	defer kRows.Close()
	for kRows.Next() {
		var k domain.KioskSummary
		if err := kRows.Scan(&k.ID, &k.OrgID, &k.Name, &k.Lat, &k.Lng, &k.Status, &k.TotalWasteCount); err != nil {
			return domain.RecycleSubmodulesOverview{}, fmt.Errorf("scan kiosk: %w", err)
		}
		ov.Kiosks = append(ov.Kiosks, k)
	}
	if err := kRows.Err(); err != nil {
		return domain.RecycleSubmodulesOverview{}, fmt.Errorf("iterate kiosks: %w", err)
	}

	wcRows, err := s.db.Query(ctx, listWelfareConfigsSQL, orgID)
	if err != nil {
		return domain.RecycleSubmodulesOverview{}, fmt.Errorf("query welfare configs: %w", err)
	}
	defer wcRows.Close()
	for wcRows.Next() {
		var wc domain.WelfareConfig
		if err := wcRows.Scan(&wc.ID, &wc.OrgID, &wc.MinMonthsActive, &wc.MinTotalWeight, &wc.DefaultPayoutAmount, &wc.CriteriaDescription); err != nil {
			return domain.RecycleSubmodulesOverview{}, fmt.Errorf("scan welfare config: %w", err)
		}
		ov.WelfareConfigs = append(ov.WelfareConfigs, wc)
	}
	if err := wcRows.Err(); err != nil {
		return domain.RecycleSubmodulesOverview{}, fmt.Errorf("iterate welfare configs: %w", err)
	}

	wpRows, err := s.db.Query(ctx, listWelfarePayoutsSQL, orgID)
	if err != nil {
		return domain.RecycleSubmodulesOverview{}, fmt.Errorf("query welfare payouts: %w", err)
	}
	defer wpRows.Close()
	for wpRows.Next() {
		var wp domain.WelfarePayout
		if err := wpRows.Scan(&wp.ID, &wp.OrgID, &wp.DeceasedName, &wp.BeneficiaryName, &wp.Amount, &wp.Status); err != nil {
			return domain.RecycleSubmodulesOverview{}, fmt.Errorf("scan welfare payout: %w", err)
		}
		ov.WelfarePayouts = append(ov.WelfarePayouts, wp)
	}
	if err := wpRows.Err(); err != nil {
		return domain.RecycleSubmodulesOverview{}, fmt.Errorf("iterate welfare payouts: %w", err)
	}

	atRows, err := s.db.Query(ctx, listAnnualTrashSubsSQL, orgID)
	if err != nil {
		return domain.RecycleSubmodulesOverview{}, fmt.Errorf("query annual trash subscriptions: %w", err)
	}
	defer atRows.Close()
	for atRows.Next() {
		var at domain.AnnualTrashSubscription
		if err := atRows.Scan(&at.ID, &at.FiscalYear, &at.UserID, &at.AnnualFee, &at.MonthFee, &at.TotalPaidAmt, &at.Status); err != nil {
			return domain.RecycleSubmodulesOverview{}, fmt.Errorf("scan annual trash subscription: %w", err)
		}
		ov.AnnualTrashSubscriptions = append(ov.AnnualTrashSubscriptions, at)
	}
	if err := atRows.Err(); err != nil {
		return domain.RecycleSubmodulesOverview{}, fmt.Errorf("iterate annual trash subscriptions: %w", err)
	}

	return ov, nil
}

// ---- Wave 5: Tabwater Module (Water Meters & Invoices) ----------------------

const listMetersSQL = `
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
WHERE ($1::bigint IS NULL OR org_id = $1)
ORDER BY meter_id
LIMIT $2 OFFSET $3
`

func (s *Store) ListMeters(ctx context.Context, orgID *int64, limit, offset int) ([]domain.WaterMeter, error) {
	rows, err := s.db.Query(ctx, listMetersSQL, orgID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query water meters: %w", err)
	}
	defer rows.Close()

	out := []domain.WaterMeter{}
	for rows.Next() {
		var m domain.WaterMeter
		if err := rows.Scan(
			&m.MeterID, &m.OrgID, &m.UserID, &m.MeterNumber, &m.SubmeterName, &m.MeterAddress,
			&m.UndertakeZoneID, &m.UndertakeSubzoneID, &m.Status, &m.OweCount, &m.CutMeter, &m.LastMeterRecording,
		); err != nil {
			return nil, fmt.Errorf("scan water meter: %w", err)
		}
		out = append(out, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate water meters: %w", err)
	}
	return out, nil
}

const listInvoicesSQL = `
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
LEFT JOIN invoice_period p ON p.id = inv.inv_period_id_fk
WHERE ($1::bigint IS NULL OR inv.org_id = $1)
  AND ($2::text = '' OR inv.status = $2)
ORDER BY inv.id DESC
LIMIT $3 OFFSET $4
`

func (s *Store) ListInvoices(ctx context.Context, orgID *int64, status string, limit, offset int) ([]domain.WaterInvoice, error) {
	rows, err := s.db.Query(ctx, listInvoicesSQL, orgID, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query water invoices: %w", err)
	}
	defer rows.Close()

	out := []domain.WaterInvoice{}
	for rows.Next() {
		var inv domain.WaterInvoice
		if err := rows.Scan(
			&inv.ID, &inv.InvoiceNo, &inv.OrgID, &inv.MeterID, &inv.PeriodID, &inv.PeriodName,
			&inv.LastMeter, &inv.CurrentMeter, &inv.WaterUsed, &inv.Paid, &inv.ReserveMeter,
			&inv.Vat, &inv.TotalPaid, &inv.Status,
		); err != nil {
			return nil, fmt.Errorf("scan water invoice: %w", err)
		}
		out = append(out, inv)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate water invoices: %w", err)
	}
	return out, nil
}
