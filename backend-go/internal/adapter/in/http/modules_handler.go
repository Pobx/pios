package http

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	"github.com/otp2025/backend-go/internal/domain"
)

func registerModuleRoutes(v1 *echo.Group, h *handler) {
	staffRoles := []string{
		domain.RoleSuperAdmin,
		domain.RoleAdmin,
		domain.RoleFinanceStaff,
		domain.RoleTabwaterStaff,
		domain.RoleRecycleBankStaff,
		domain.RoleFoodwasteStaff,
		domain.RoleAnnualStaff,
	}

	// Wave 1.5: Identity, Users, Zones, Safe LINE Account Linking & Resident Portal
	if h.identity != nil {
		v1.GET("/users", h.listUsers, requireAnyRole(staffRoles...))
		v1.POST("/users", h.createUser, requireAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin))
		v1.GET("/zones", h.listZones, requireAnyRole(staffRoles...))
		v1.POST("/zones", h.createZone, requireAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin))
		v1.POST("/users/:id/link-line", h.linkLineAccount, requireAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin))
		v1.GET("/resident/overview", h.getResidentOverview)
	}

	// Wave 2: Inventory Module (Read + Write + Approval)
	if h.inventory != nil {
		invRoles := []string{domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFinanceStaff}
		v1.GET("/inventory/items", h.listInventoryItems, requireAnyRole(invRoles...))
		v1.POST("/inventory/items", h.createInventoryItem, requireAnyRole(invRoles...))
		v1.GET("/inventory/transactions", h.listInventoryTransactions, requireAnyRole(invRoles...))
		v1.POST("/inventory/transactions", h.createInventoryTransaction, requireAnyRole(invRoles...))
		v1.POST("/inventory/transactions/:id/decision", h.decideInventoryTransaction, requireAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin))
	}

	// Wave 3: FoodWaste & Carbon Emission Module (Read + Write)
	if h.foodwaste != nil {
		fwRoles := []string{domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFoodwasteStaff}
		v1.GET("/foodwaste/summary", h.getFoodWasteSummary, requireAnyRole(fwRoles...))
		v1.POST("/foodwaste/batches", h.createCompostBatch, requireAnyRole(fwRoles...))
		v1.POST("/foodwaste/logs", h.createWasteLog, requireAnyRole(fwRoles...))
	}

	// Wave 4: KeptKaya / Recycle Bank Module (Read + Accounts + Purchase + Withdraw + Price + Submodules: Kiosk/Welfare/AnnualTrash)
	if h.recycle != nil {
		rcRoles := []string{domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleRecycleBankStaff, domain.RoleFinanceStaff, domain.RoleAnnualStaff}
		v1.GET("/recycle/items", h.listRecycleItems, requireAnyRole(rcRoles...))
		v1.POST("/recycle/items/:id/price", h.setRecycleItemPrice, requireAnyRole(rcRoles...))
		v1.GET("/recycle/accounts", h.listRecycleAccounts, requireAnyRole(rcRoles...))
		v1.POST("/recycle/purchases", h.recordRecyclePurchase, requireAnyRole(rcRoles...))
		v1.POST("/recycle/withdrawals", h.createRecycleWithdrawal, requireAnyRole(rcRoles...))
		v1.GET("/recycle/submodules", h.getRecycleSubmodules, requireAnyRole(rcRoles...))
		v1.POST("/kiosks/:id/ingest", h.ingestKioskTelemetry, requireAnyRole(rcRoles...))
	}

	// Wave 5: Tabwater Module (Meters, Periods, Invoices, Readings, Payment & CSV Report Export)
	if h.tabwater != nil {
		twRoles := []string{domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleTabwaterStaff, domain.RoleFinanceStaff}
		v1.GET("/tabwater/periods", h.listTabwaterPeriods, requireAnyRole(twRoles...))
		v1.POST("/tabwater/periods", h.createTabwaterPeriod, requireAnyRole(twRoles...))
		v1.GET("/tabwater/meters", h.listTabwaterMeters, requireAnyRole(twRoles...))
		v1.POST("/tabwater/meters", h.createTabwaterMeter, requireAnyRole(twRoles...))
		v1.GET("/tabwater/invoices", h.listTabwaterInvoices, requireAnyRole(twRoles...))
		v1.POST("/tabwater/readings", h.recordTabwaterReading, requireAnyRole(twRoles...))
		v1.POST("/tabwater/invoices/:id/pay", h.payTabwaterInvoice, requireAnyRole(twRoles...))
		v1.GET("/reports/tabwater-invoices.csv", h.exportTabwaterInvoicesCSV, requireAnyRole(twRoles...))
	}
}

func parseRequestedOrgID(c echo.Context) (*int64, error) {
	raw := strings.TrimSpace(c.QueryParam("org_id"))
	if raw == "" {
		raw = strings.TrimSpace(c.Request().Header.Get("X-Org-Id"))
	}
	if raw == "" {
		return nil, nil
	}
	v, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || v <= 0 {
		return nil, domain.ErrBadRequest
	}
	return &v, nil
}

func parsePagination(c echo.Context) (int, int) {
	limit := 50
	offset := 0
	if rawLimit := strings.TrimSpace(c.QueryParam("limit")); rawLimit != "" {
		if v, err := strconv.Atoi(rawLimit); err == nil {
			limit = v
		}
	}
	if rawOffset := strings.TrimSpace(c.QueryParam("offset")); rawOffset != "" {
		if v, err := strconv.Atoi(rawOffset); err == nil {
			offset = v
		}
	}
	return limit, offset
}

func (h *handler) listUsers(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	limit, offset := parsePagination(c)
	users, err := h.identity.ListUsers(c.Request().Context(), claims, reqOrgID, c.QueryParam("q"), limit, offset)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, users)
}

func (h *handler) listZones(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	zones, err := h.identity.ListZones(c.Request().Context(), claims, reqOrgID)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, zones)
}

type linkLinePayload struct {
	LineUserID       string `json:"line_user_id"`
	VerificationMode string `json:"verification_mode"`
	VerificationCode string `json:"verification_code"`
}

func (h *handler) linkLineAccount(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	targetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || targetID <= 0 {
		return writeProblem(c, http.StatusBadRequest, "invalid user id")
	}
	var body linkLinePayload
	if err := c.Bind(&body); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	updated, err := h.identity.LinkLineAccount(c.Request().Context(), claims, reqOrgID, domain.LineLinkCommand{
		TargetUserID:     targetID,
		LineUserID:       body.LineUserID,
		VerificationMode: body.VerificationMode,
		VerificationCode: body.VerificationCode,
	})
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) getResidentOverview(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	ov, err := h.identity.GetResidentOverview(c.Request().Context(), claims, reqOrgID)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, ov)
}

func (h *handler) listInventoryItems(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	items, err := h.inventory.ListItems(c.Request().Context(), claims, reqOrgID)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, items)
}

func (h *handler) createInventoryItem(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.CreateInventoryItemCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	created, err := h.inventory.CreateItem(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) listInventoryTransactions(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	txs, err := h.inventory.ListTransactions(c.Request().Context(), claims, reqOrgID)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, txs)
}

func (h *handler) createInventoryTransaction(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.CreateInventoryTransactionCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	created, err := h.inventory.CreateTransaction(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) decideInventoryTransaction(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	txID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || txID <= 0 {
		return writeProblem(c, http.StatusBadRequest, "invalid transaction id")
	}
	var cmd domain.TransactionDecisionCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	cmd.TransactionID = txID
	updated, err := h.inventory.DecideTransaction(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) getFoodWasteSummary(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	summary, err := h.foodwaste.GetSummary(c.Request().Context(), claims, reqOrgID)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, summary)
}

func (h *handler) createCompostBatch(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.CreateCompostBatchCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	created, err := h.foodwaste.CreateCompostBatch(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) createWasteLog(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.CreateWasteLogCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	created, err := h.foodwaste.CreateWasteLog(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) listRecycleItems(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	items, err := h.recycle.ListItems(c.Request().Context(), claims, reqOrgID)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, items)
}

func (h *handler) listRecycleAccounts(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	accounts, err := h.recycle.ListBankAccounts(c.Request().Context(), claims, reqOrgID)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, accounts)
}

func (h *handler) recordRecyclePurchase(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.RecordRecyclePurchaseCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	created, err := h.recycle.RecordPurchase(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) listTabwaterMeters(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	limit, offset := parsePagination(c)
	meters, err := h.tabwater.ListMeters(c.Request().Context(), claims, reqOrgID, limit, offset)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, meters)
}

func (h *handler) listTabwaterInvoices(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	limit, offset := parsePagination(c)
	invoices, err := h.tabwater.ListInvoices(c.Request().Context(), claims, reqOrgID, c.QueryParam("status"), limit, offset)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, invoices)
}

func (h *handler) recordTabwaterReading(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.RecordMeterReadingCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	created, err := h.tabwater.RecordMeterReading(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) payTabwaterInvoice(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	invID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || invID <= 0 {
		return writeProblem(c, http.StatusBadRequest, "invalid invoice id")
	}
	var cmd domain.PayWaterInvoiceCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	cmd.InvoiceID = invID
	updated, err := h.tabwater.PayInvoice(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) getRecycleSubmodules(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	ov, err := h.recycle.GetSubmodulesOverview(c.Request().Context(), claims, reqOrgID)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, ov)
}

func (h *handler) exportTabwaterInvoicesCSV(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	limit, offset := parsePagination(c)
	invoices, err := h.tabwater.ListInvoices(c.Request().Context(), claims, reqOrgID, c.QueryParam("status"), limit, offset)
	if err != nil {
		return mapError(c, err)
	}

	var buf bytes.Buffer
	// Write UTF-8 BOM for Excel compatibility
	buf.Write([]byte{0xEF, 0xBB, 0xBF})
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{"invoice_id", "inv_no", "org_id", "meter_id", "period", "last_meter", "current_meter", "water_used", "water_charge", "reserve_fee", "vat", "total_paid", "status"})
	for _, inv := range invoices {
		_ = w.Write([]string{
			strconv.FormatInt(inv.ID, 10),
			inv.InvoiceNo,
			strconv.FormatInt(inv.OrgID, 10),
			strconv.FormatInt(inv.MeterID, 10),
			inv.PeriodName,
			fmt.Sprintf("%.2f", inv.LastMeter),
			fmt.Sprintf("%.2f", inv.CurrentMeter),
			fmt.Sprintf("%.2f", inv.WaterUsed),
			fmt.Sprintf("%.2f", inv.Paid),
			fmt.Sprintf("%.2f", inv.ReserveMeter),
			fmt.Sprintf("%.2f", inv.Vat),
			fmt.Sprintf("%.2f", inv.TotalPaid),
			inv.Status,
		})
	}
	w.Flush()

	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="tabwater-invoices.csv"`)
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", buf.Bytes())
}

func (h *handler) ingestKioskTelemetry(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	kioskID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || kioskID <= 0 {
		return writeProblem(c, http.StatusBadRequest, "invalid kiosk id")
	}

	idemKey := strings.TrimSpace(c.Request().Header.Get("Idempotency-Key"))
	if idemKey != "" {
		h.idempotencyMu.Lock()
		cached, ok := h.idempotencyCache[idemKey]
		h.idempotencyMu.Unlock()
		if ok {
			c.Response().Header().Set("X-Idempotent-Replay", "true")
			return c.JSON(http.StatusOK, cached)
		}
	}

	var cmd domain.KioskIngestCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	cmd.KioskID = kioskID

	updated, err := h.recycle.IngestKioskTelemetry(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}

	if idemKey != "" {
		h.idempotencyMu.Lock()
		h.idempotencyCache[idemKey] = updated
		h.idempotencyMu.Unlock()
	}

	return c.JSON(http.StatusOK, updated)
}

func (h *handler) handleLineWebhook(c echo.Context) error {
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return writeProblem(c, http.StatusBadRequest, "failed to read webhook body")
	}
	secret := strings.TrimSpace(os.Getenv("LINE_CHANNEL_SECRET"))
	if secret == "" {
		secret = "otp-dev-line-channel-secret"
	}
	sig := c.Request().Header.Get("X-Line-Signature")
	if !domain.VerifyLineWebhookSignature(secret, body, sig) {
		return writeProblem(c, http.StatusUnauthorized, "invalid or missing X-Line-Signature")
	}

	var payload struct {
		Events []map[string]any `json:"events"`
	}
	if len(body) > 0 {
		if err := json.Unmarshal(body, &payload); err != nil {
			return writeProblem(c, http.StatusBadRequest, "invalid LINE webhook JSON")
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
		"status":           "ok",
		"processed_events": len(payload.Events),
	})
}

func (h *handler) createUser(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.CreateUserCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	created, err := h.identity.CreateUser(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) createZone(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.CreateZoneCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	created, err := h.identity.CreateZone(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) createRecycleWithdrawal(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.CreateRecycleWithdrawalCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	updated, err := h.recycle.WithdrawMemberBalance(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) setRecycleItemPrice(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	itemID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || itemID <= 0 {
		return writeProblem(c, http.StatusBadRequest, "invalid item id")
	}
	var cmd domain.SetRecycleItemPriceCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	cmd.ItemID = itemID
	updated, err := h.recycle.SetRecycleItemPrice(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *handler) listTabwaterPeriods(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	periods, err := h.tabwater.ListPeriods(c.Request().Context(), claims, reqOrgID)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusOK, periods)
}

func (h *handler) createTabwaterPeriod(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.CreateInvoicePeriodCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	created, err := h.tabwater.CreatePeriod(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *handler) createTabwaterMeter(c echo.Context) error {
	claims, _ := getClaims(c)
	reqOrgID, err := parseRequestedOrgID(c)
	if err != nil {
		return mapError(c, err)
	}
	var cmd domain.CreateWaterMeterCommand
	if err := c.Bind(&cmd); err != nil {
		return writeProblem(c, http.StatusBadRequest, "invalid JSON payload")
	}
	created, err := h.tabwater.CreateMeter(c.Request().Context(), claims, reqOrgID, cmd)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}
