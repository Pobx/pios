# Integration Contracts (shared by backend-go, frontend-react, deploy)

All three workstreams MUST follow this contract so they integrate without rework.

## Ports / hosts (local Docker Compose)
| Service | Container host:port | Published to host |
|---|---|---|
| nginx (gateway) | nginx:80 | `localhost:80` |
| frontend (static, nginx inside) | frontend:80 | (via gateway only) |
| backend (Go/Echo) | backend:8080 | (via gateway; optional `localhost:8080` for debug) |
| keycloak | keycloak:8080 | `localhost:8081` |
| postgres | postgres:5432 | `127.0.0.1:5432` |

Gateway routing: `/api/` → backend:8080 (keep `/api` prefix), everything else → frontend with SPA fallback (`try_files $uri /index.html`). Forward `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Authorization`.

## Keycloak
- Realm `otp`. **External (browser) issuer**: `http://localhost:8081/realms/otp` (set `KC_HOSTNAME=http://localhost:8081`). **Internal JWKS** (backend → keycloak): `http://keycloak:8080/realms/otp/protocol/openid-connect/certs`.
- Backend validates `iss` == external issuer (NOT the internal URL) and fetches keys from the internal JWKS URL. Both come from env.
- Clients: `otp-web` (public, Auth Code + PKCE, redirect `http://localhost/*`, web origin `http://localhost`), `otp-api` (bearer-only/resource). Access token must contain `aud` = `otp-api` (audience mapper) and claims: `sub`, `preferred_username`, `realm_access.roles`, `org_id` (user attribute mapper; integer).
- Realm roles: `super_admin`, `admin`, `finance_staff`, `tabwater_staff`, `recycle_bank_staff`, `foodwaste_staff`, `annual_staff`, `user`.
- Dev users (dev only): `admin1`/`admin1` (admin, org_id=1), `user1`/`user1` (user, org_id=1), `super1`/`super1` (super_admin, no org_id).

## Backend env
`HTTP_ADDR=:8080`, `DATABASE_URL=postgres://otp:otp_dev_password@postgres:5432/otp?sslmode=disable`, `KEYCLOAK_ISSUER`, `KEYCLOAK_JWKS_URL`, `KEYCLOAK_AUDIENCE=otp-api`, `CORS_ALLOWED_ORIGINS=http://localhost`, `LOG_LEVEL=info`.

## Backend API (v1)
- `GET /healthz` (no auth) → `200 {"status":"ok"}`; `GET /readyz` (no auth) → 200 when DB reachable else 503.
- `GET /api/v1/me` (auth) → `{ "sub","username","roles":[...],"org_id":1|null }`.
- `GET /api/v1/organizations` (auth; role `admin` or `super_admin`) → `[{"id","code","name","type_id"}]`. Non-super-admin sees only own org. Errors use RFC 7807 `application/problem+json`. 401 missing/invalid token, 403 insufficient role.
- Go module path: `github.com/otp2025/backend-go`. Hexagonal layout: `cmd/api`, `internal/domain`, `internal/app` (use cases + ports), `internal/adapter/in/http`, `internal/adapter/out/{postgres,keycloak}`, `pkg/`.

## Frontend runtime config (K8s-friendly: no rebuild per environment)
Frontend reads `window.__APP_CONFIG__` loaded from `/config.js` (generated at container start from env via envsubst; committed `public/config.js` holds local defaults). Keys: `KEYCLOAK_AUTHORITY`, `KEYCLOAK_CLIENT_ID` (`otp-web`), `API_BASE_URL` (`/api`). Falls back to `import.meta.env.VITE_*` for `npm run dev`.
Dev server: `npm run dev` on `localhost:5173` (Vite proxies `/api` to `http://localhost:8080`); Keycloak client must therefore also allow `http://localhost:5173/*`.

## Container images
- `backend-go/Dockerfile`: multi-stage, static binary, non-root, arm64+amd64 capable (use `golang` image matching go.mod's Go version; verify it exists).
- `frontend-react/Dockerfile`: multi-stage (node build → nginx:alpine), serves on :80, runs envsubst for `/config.js`, SPA fallback.

## Conventions
Conventional commits. No secrets in git (dev-only defaults allowed in `.env.example`/compose). All config via env/ConfigMap/Secret.
