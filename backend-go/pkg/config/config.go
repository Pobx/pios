// Package config loads and validates environment configuration.
package config

import (
	"fmt"
	"log/slog"
	"strings"
)

// Config holds runtime settings loaded from environment variables.
type Config struct {
	HTTPAddr           string
	DatabaseURL        string
	KeycloakIssuer     string
	KeycloakJWKSURL    string
	KeycloakAudience   string
	CORSAllowedOrigins []string
	LogLevel           slog.Level
}

// FromEnv builds a Config using the provided lookup function (e.g. os.Getenv).
func FromEnv(getenv func(string) string) (Config, error) {
	cfg := Config{
		HTTPAddr:           withDefault(getenv("HTTP_ADDR"), ":8080"),
		DatabaseURL:        strings.TrimSpace(getenv("DATABASE_URL")),
		KeycloakIssuer:     strings.TrimSpace(getenv("KEYCLOAK_ISSUER")),
		KeycloakJWKSURL:    strings.TrimSpace(getenv("KEYCLOAK_JWKS_URL")),
		KeycloakAudience:   withDefault(getenv("KEYCLOAK_AUDIENCE"), "otp-api"),
		CORSAllowedOrigins: splitCSV(withDefault(getenv("CORS_ALLOWED_ORIGINS"), "http://localhost")),
		LogLevel:           parseLogLevel(getenv("LOG_LEVEL")),
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.KeycloakIssuer == "" {
		return Config{}, fmt.Errorf("KEYCLOAK_ISSUER is required")
	}
	if cfg.KeycloakJWKSURL == "" {
		return Config{}, fmt.Errorf("KEYCLOAK_JWKS_URL is required")
	}
	return cfg, nil
}

func withDefault(val, def string) string {
	val = strings.TrimSpace(val)
	if val == "" {
		return def
	}
	return val
}

func splitCSV(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if s := strings.TrimSpace(part); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func parseLogLevel(raw string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
