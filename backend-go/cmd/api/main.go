// Command api is the OTP Go backend entrypoint.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	httpadapter "github.com/otp2025/backend-go/internal/adapter/in/http"
	"github.com/otp2025/backend-go/internal/adapter/out/keycloak"
	"github.com/otp2025/backend-go/internal/adapter/out/postgres"
	"github.com/otp2025/backend-go/internal/app"
	"github.com/otp2025/backend-go/pkg/config"
)

func main() {
	cfg, err := config.FromEnv(os.Getenv)
	if err != nil {
		slog.Error("invalid configuration", "err", err)
		os.Exit(1)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := postgres.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to initialize postgres pool", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	store := postgres.NewStore(pool)
	verifier := keycloak.NewVerifier(keycloak.Config{
		Issuer:   cfg.KeycloakIssuer,
		JWKSURL:  cfg.KeycloakJWKSURL,
		Audience: cfg.KeycloakAudience,
	})
	orgService := app.NewOrganizationService(store)

	e := httpadapter.NewServer(httpadapter.Deps{
		Verifier:           verifier,
		Organizations:      orgService,
		Health:             store,
		CORSAllowedOrigins: cfg.CORSAllowedOrigins,
	})

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           e,
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("starting HTTP server", "addr", cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case <-ctx.Done():
		logger.Info("shutting down HTTP server")
	case err := <-errCh:
		if err != nil {
			logger.Error("HTTP server failed", "err", err)
			os.Exit(1)
		}
		return
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "err", err)
		os.Exit(1)
	}
	logger.Info("HTTP server stopped")
}
