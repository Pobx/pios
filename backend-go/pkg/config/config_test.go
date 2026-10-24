package config_test

import (
	"log/slog"
	"testing"

	"github.com/otp2025/backend-go/pkg/config"
)

func validEnv() map[string]string {
	return map[string]string{
		"DATABASE_URL":         "postgres://otp:pw@postgres:5432/otp?sslmode=disable",
		"KEYCLOAK_ISSUER":      "http://localhost:8081/realms/otp",
		"KEYCLOAK_JWKS_URL":    "http://keycloak:8080/realms/otp/protocol/openid-connect/certs",
		"KEYCLOAK_AUDIENCE":    "otp-api",
		"CORS_ALLOWED_ORIGINS": "http://localhost, http://localhost:5173",
		"HTTP_ADDR":            ":9090",
		"LOG_LEVEL":            "debug",
	}
}

func lookupFrom(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

func TestFromEnv(t *testing.T) {
	cfg, err := config.FromEnv(lookupFrom(validEnv()))
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if cfg.HTTPAddr != ":9090" {
		t.Fatalf("HTTPAddr = %q", cfg.HTTPAddr)
	}
	if cfg.KeycloakAudience != "otp-api" {
		t.Fatalf("KeycloakAudience = %q", cfg.KeycloakAudience)
	}
	if len(cfg.CORSAllowedOrigins) != 2 || cfg.CORSAllowedOrigins[1] != "http://localhost:5173" {
		t.Fatalf("CORSAllowedOrigins = %v", cfg.CORSAllowedOrigins)
	}
	if cfg.LogLevel != slog.LevelDebug {
		t.Fatalf("LogLevel = %v", cfg.LogLevel)
	}
}

func TestFromEnvDefaults(t *testing.T) {
	env := map[string]string{
		"DATABASE_URL":      "postgres://otp:pw@postgres:5432/otp?sslmode=disable",
		"KEYCLOAK_ISSUER":   "http://localhost:8081/realms/otp",
		"KEYCLOAK_JWKS_URL": "http://keycloak:8080/realms/otp/protocol/openid-connect/certs",
	}
	cfg, err := config.FromEnv(lookupFrom(env))
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if cfg.HTTPAddr != ":8080" || cfg.KeycloakAudience != "otp-api" || cfg.LogLevel != slog.LevelInfo {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
	if len(cfg.CORSAllowedOrigins) != 1 || cfg.CORSAllowedOrigins[0] != "http://localhost" {
		t.Fatalf("unexpected default CORS origins: %v", cfg.CORSAllowedOrigins)
	}
}

func TestFromEnvMissingRequired(t *testing.T) {
	for _, key := range []string{"DATABASE_URL", "KEYCLOAK_ISSUER", "KEYCLOAK_JWKS_URL"} {
		t.Run(key, func(t *testing.T) {
			env := validEnv()
			delete(env, key)
			if _, err := config.FromEnv(lookupFrom(env)); err == nil {
				t.Fatalf("expected error when %s is missing", key)
			}
		})
	}
}

func TestParseLogLevel(t *testing.T) {
	for _, tc := range []struct {
		in   string
		want slog.Level
	}{
		{"debug", slog.LevelDebug},
		{"INFO", slog.LevelInfo},
		{"warn", slog.LevelWarn},
		{"error", slog.LevelError},
		{"unknown", slog.LevelInfo},
	} {
		env := validEnv()
		env["LOG_LEVEL"] = tc.in
		cfg, err := config.FromEnv(lookupFrom(env))
		if err != nil {
			t.Fatal(err)
		}
		if cfg.LogLevel != tc.want {
			t.Fatalf("level(%q) = %v, want %v", tc.in, cfg.LogLevel, tc.want)
		}
	}
}
