# OTP Backend (Go / Echo v4)

Hexagonal (Ports & Adapters) Go backend replacing the legacy Laravel application.

## Layout

- `cmd/api`: Service entrypoint, configuration, structured logging (`slog`), graceful shutdown
- `internal/domain`: Pure domain entities, claims, role logic, and domain errors
- `internal/app`: Application use cases and inbound/outbound port interfaces
- `internal/adapter/in/http`: Echo v4 HTTP server, Bearer/JWKS middleware, RBAC middleware, v1 handlers
- `internal/adapter/out/keycloak`: Keycloak RS256 JWKS token verifier with key caching and cooldown-guarded refresh on unknown `kid`
- `internal/adapter/out/postgres`: `pgx/v5` pool implementing `OrganizationRepository` and `HealthChecker`
- `pkg/config`: Environment variable loader and validator
- `pkg/problem`: RFC 7807 `application/problem+json` response helper

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `HTTP_ADDR` | No | `:8080` | HTTP listen address |
| `DATABASE_URL` | Yes | — | PostgreSQL connection URL |
| `KEYCLOAK_ISSUER` | Yes | — | Expected `iss` claim (external Keycloak realm URL) |
| `KEYCLOAK_JWKS_URL` | Yes | — | Internal JWKS endpoint URL |
| `KEYCLOAK_AUDIENCE` | No | `otp-api` | Expected `aud` claim |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost` | Comma-separated allowed CORS origins |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |

## Commands

```sh
make test    # go test ./... -race -cover
make vet     # go vet ./...
make build   # static binary at bin/api
make docker  # multi-stage non-root container image
```
