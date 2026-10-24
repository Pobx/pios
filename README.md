# OTP Platform (Modernized Go + React + PostgreSQL + Keycloak)

Modernized multi-tenant municipal platform migrated from legacy Laravel 11 + MySQL (`otp2025`) to **Go (Echo v4, Hexagonal Architecture)**, **React 18 (TypeScript, Vite, Tailwind CSS)**, **PostgreSQL 16**, and **Keycloak 26 (OIDC PKCE & RS256 JWKS)**.

---

## Architecture & Directory Structure

- `backend-go/` — Go 1.27 Hexagonal API server (`domain`, `app`, `adapter/in/http`, `adapter/out/postgres`, `adapter/out/keycloak`)
- `frontend-react/` — React 18 + TypeScript + Vite SPA with OIDC PKCE (`react-oidc-context`), Axios Bearer token interceptor, and runtime `/config.js`
- `deploy/`
  - `docker-compose.yml` — Local full-stack environment (`otp-postgres`, `otp-keycloak`, `otp-backend`, `otp-frontend`, `otp-gateway`)
  - `keycloak/realm-otp.json` — Preconfigured `otp` realm with clients (`otp-web`, `otp-api`, `otp-cli-test`), roles, `org_id` mapper, and test users
  - `nginx/default.conf` — Reverse proxy routing `/api` → Backend, `/realms` & `/resources` → Keycloak, `/` → Frontend SPA
  - `k8s/` — Production Kubernetes manifests (stateless workloads + external PostgreSQL via `Secret`)
- `tools/`
  - `mysql2pg/` — Automated MariaDB/MySQL dump to PostgreSQL 16 DDL (`000001_baseline.up.sql`) and data loader (`load_data.py`), normalizing all 47 `org_id_fk` columns to `org_id`
  - `keycloak_sync/export_users.py` — Exports and syncs PostgreSQL `users` & `staffs` into Keycloak with `org_id`, `legacy_user_id`, roles, and one-time `staff_link_code`
  - `cutover/verify_integrity.py` — Post-cutover table, schema normalization, row count, and financial reconciliation verifier

---

## Quick Start (Docker Compose)

```bash
docker compose -f deploy/docker-compose.yml up -d --build --wait
```

- **Web App (via Nginx Gateway)**: `http://localhost`
- **Keycloak Admin / OIDC**: `http://localhost:8081` (`admin` / `admin`)
- **Backend Health / Readiness**: `http://localhost:8080/healthz` and `http://localhost:8080/readyz`

### Default Accounts (`realm: otp`)
| Username | Password | Role | Tenant (`org_id`) |
|---|---|---|---|
| `super1` | `password` | `super_admin` | All organizations (`null`) |
| `admin1` | `password` | `admin` | `1` (HSG1 — ห้องแซง) |
| `user1` | `password` | `user` | `1` (HSG1 — ห้องแซง) |
| `user2` | `password` | `user` (Migrated Resident) | `1` (HSG1 — สมใจ พูลสวัสดิ์) |

---

## Mandatory 4-Tier Test Suite

Run all 4 test tiers with a single command:

```bash
make test
```

Or run each tier individually:
1. **Unit Tests**: `make test-unit`
2. **API Tests with Mocks**: `make test-api-mock`
3. **API Integration Tests (Real PostgreSQL 16)**: `make test-api-integration`
4. **E2E Tests with Mocks**: `make test-e2e-mock`

---

## Cutover & User Synchronization Utilities

```bash
# Verify PostgreSQL schema (110 tables, 0 legacy org_id_fk) and financial totals
python3 tools/cutover/verify_integrity.py

# Sync migrated PostgreSQL users/staffs into live Keycloak realm
python3 tools/keycloak_sync/export_users.py --limit 100 --sync-keycloak
```
