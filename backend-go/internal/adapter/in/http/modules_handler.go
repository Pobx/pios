package http

import (
	"net/http"
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

	// Wave 1.5: Identity, Users, Zones & Safe LINE Account Linking
	if h.identity != nil {
		v1.GET("/users", h.listUsers, requireAnyRole(staffRoles...))
		v1.GET("/zones", h.listZones, requireAnyRole(staffRoles...))
		v1.POST("/users/:id/link-line", h.linkLineAccount, requireAnyRole(domain.RoleSuperAdmin, domain.RoleAdmin))
	}

	// Wave 2: Inventory Module
	if h.inventory != nil {
		invRoles := []string{domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFinanceStaff}
		v1.GET("/inventory/items", h.listInventoryItems, requireAnyRole(invRoles...))
		v1.GET("/inventory/transactions", h.listInventoryTransactions, requireAnyRole(invRoles...))
	}

	// Wave 3: FoodWaste & Carbon Emission Module
	if h.foodwaste != nil {
		fwRoles := []string{domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleFoodwasteStaff}
		v1.GET("/foodwaste/summary", h.getFoodWasteSummary, requireAnyRole(fwRoles...))
	}

	// Wave 4: KeptKaya / Recycle Bank Module
	if h.recycle != nil {
		rcRoles := []string{domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleRecycleBankStaff, domain.RoleFinanceStaff}
		v1.GET("/recycle/items", h.listRecycleItems, requireAnyRole(rcRoles...))
	}

	// Wave 5: Tabwater Module
	if h.tabwater != nil {
		twRoles := []string{domain.RoleSuperAdmin, domain.RoleAdmin, domain.RoleTabwaterStaff, domain.RoleFinanceStaff}
		v1.GET("/tabwater/meters", h.listTabwaterMeters, requireAnyRole(twRoles...))
		v1.GET("/tabwater/invoices", h.listTabwaterInvoices, requireAnyRole(twRoles...))
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
