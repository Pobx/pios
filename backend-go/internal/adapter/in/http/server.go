// Package http is the inbound HTTP adapter built on Echo v4.
package http

import (
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/otp2025/backend-go/internal/app"
	"github.com/otp2025/backend-go/internal/domain"
	"github.com/otp2025/backend-go/pkg/problem"
)

const claimsContextKey = "auth.claims"

// Deps bundles dependencies required by the HTTP server.
type Deps struct {
	Verifier           app.TokenVerifier
	Organizations      *app.OrganizationService
	Health             app.HealthChecker
	CORSAllowedOrigins []string
}

// NewServer constructs an Echo instance wired with routes and middleware.
func NewServer(deps Deps) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.Use(middleware.Recover())
	if len(deps.CORSAllowedOrigins) > 0 {
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins: deps.CORSAllowedOrigins,
			AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
			AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		}))
	}

	h := &handler{
		organizations: deps.Organizations,
		health:        deps.Health,
	}

	e.GET("/healthz", h.healthz)
	e.GET("/readyz", h.readyz)

	v1 := e.Group("/api/v1", authMiddleware(deps.Verifier))
	v1.GET("/me", h.me)
	v1.GET("/organizations", h.listOrganizations, requireAnyRole(domain.RoleAdmin, domain.RoleSuperAdmin))

	return e
}

type handler struct {
	organizations *app.OrganizationService
	health        app.HealthChecker
}

type statusResponse struct {
	Status string `json:"status"`
}

type meResponse struct {
	Sub      string   `json:"sub"`
	Username string   `json:"username"`
	Roles    []string `json:"roles"`
	OrgID    *int64   `json:"org_id"`
}

type organizationResponse struct {
	ID     int64  `json:"id"`
	Code   string `json:"code"`
	Name   string `json:"name"`
	TypeID int64  `json:"type_id"`
}

func (h *handler) healthz(c echo.Context) error {
	return c.JSON(http.StatusOK, statusResponse{Status: "ok"})
}

func (h *handler) readyz(c echo.Context) error {
	if h.health != nil {
		if err := h.health.Ping(c.Request().Context()); err != nil {
			return writeProblem(c, http.StatusServiceUnavailable, "database unavailable")
		}
	}
	return c.JSON(http.StatusOK, statusResponse{Status: "ok"})
}

func (h *handler) me(c echo.Context) error {
	claims, ok := getClaims(c)
	if !ok {
		return writeProblem(c, http.StatusUnauthorized, "unauthenticated")
	}
	roles := claims.Roles
	if roles == nil {
		roles = []string{}
	}
	return c.JSON(http.StatusOK, meResponse{
		Sub:      claims.Subject,
		Username: claims.Username,
		Roles:    roles,
		OrgID:    claims.OrgID,
	})
}

func (h *handler) listOrganizations(c echo.Context) error {
	claims, ok := getClaims(c)
	if !ok {
		return writeProblem(c, http.StatusUnauthorized, "unauthenticated")
	}
	orgs, err := h.organizations.List(c.Request().Context(), claims)
	if err != nil {
		return mapError(c, err)
	}
	out := make([]organizationResponse, len(orgs))
	for i, o := range orgs {
		out[i] = organizationResponse{
			ID:     o.ID,
			Code:   o.Code,
			Name:   o.Name,
			TypeID: o.TypeID,
		}
	}
	return c.JSON(http.StatusOK, out)
}

func authMiddleware(verifier app.TokenVerifier) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw, ok := extractBearer(c.Request().Header.Get(echo.HeaderAuthorization))
			if !ok {
				return writeProblem(c, http.StatusUnauthorized, "missing or invalid authorization header")
			}
			claims, err := verifier.Verify(c.Request().Context(), raw)
			if err != nil {
				return writeProblem(c, http.StatusUnauthorized, "invalid or expired token")
			}
			c.Set(claimsContextKey, claims)
			return next(c)
		}
	}
}

func requireAnyRole(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			claims, ok := getClaims(c)
			if !ok {
				return writeProblem(c, http.StatusUnauthorized, "unauthenticated")
			}
			if !claims.HasAnyRole(roles...) {
				return writeProblem(c, http.StatusForbidden, "insufficient role")
			}
			return next(c)
		}
	}
}

func extractBearer(header string) (string, bool) {
	const prefix = "Bearer "
	if len(header) < len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return "", false
	}
	tok := strings.TrimSpace(header[len(prefix):])
	if tok == "" {
		return "", false
	}
	return tok, true
}

func getClaims(c echo.Context) (domain.Claims, bool) {
	v := c.Get(claimsContextKey)
	if v == nil {
		return domain.Claims{}, false
	}
	claims, ok := v.(domain.Claims)
	return claims, ok
}

func mapError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, domain.ErrUnauthorized):
		return writeProblem(c, http.StatusUnauthorized, err.Error())
	case errors.Is(err, domain.ErrForbidden):
		return writeProblem(c, http.StatusForbidden, "insufficient permissions")
	case errors.Is(err, domain.ErrNotFound):
		return writeProblem(c, http.StatusNotFound, "resource not found")
	default:
		return writeProblem(c, http.StatusInternalServerError, "internal server error")
	}
}

func writeProblem(c echo.Context, status int, detail string) error {
	return problem.Write(c.Response().Writer, status, detail, c.Request().URL.Path)
}
