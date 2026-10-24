# OTP Migration — Master Plan (execution)

Source of truth for scope: `../requirement.md` (ADLC, 6 phases). Analysis background: Laravel project `homework/otp2025` (+ production dump in `docs/`, git-ignored).

## Assumptions (decided to proceed; change here if wrong)
| # | Assumption | Why / impact |
|---|---|---|
| A1 | **Tenancy = shared schema + `org_id` on every org-owned table + PostgreSQL RLS** (not DB-per-org) | Current Laravel HEAD runs one DB with `org_id_fk` (multi-db abandoned Oct 2025); prod dump = one DB, 3 orgs (HSG1, TNG1, KUCSC). `TenantResolver` abstraction keeps option to change. |
| A2 | Source schema = production dump (MariaDB 11.8, 110 tables), not repo migrations | Prod may be behind/ahead of repo (e.g. no `tabwater_stations` in dump). |
| A3 | Data volume is tiny (≈2.3 MB dump, 168 users, 375 invoices) | Cutover can be full dump/load inside 60 min window; no CDC/delta needed. Must still rehearse. |
| A4 | First iteration = **foundation + one vertical slice** (auth → `/me` → organizations read). Business modules follow module-by-module | Whole product is too large for one pass; foundation unblocks everything. |
| A5 | LINE login kept (Keycloak IdP), no OTP; linking via old password / staff code / approval | Deferred to the Auth module iteration, not in foundation. |
| A6 | Local = Docker Compose (Nginx, FE, BE, Postgres, Keycloak). Prod = K8s manifests, Postgres external (RDS/bare metal) | Per requirement.md. |
| A7 | Plain K8s YAML first (no Helm/GitOps) | Per requirement.md structure. |

## Phases → this repo
| Phase | Deliverable | Location | Status |
|---|---|---|---|
| 1.1 DB schema | Mapping rules + generated PG baseline DDL from dump, loadable in local PG | `docs/design/01-postgres-schema.md`, `backend-go/db/migrations`, `tools/mysql2pg` | in progress |
| 1.2 Auth flow | OIDC design doc | `docs/design/02-auth-flow.md` | in progress |
| 1.3 Domain extraction | Module inventory + use-case catalogue (first slice detailed) | `docs/design/03-domain-extraction.md` | in progress |
| 2 Workspaces | git worktrees: backend-go, frontend-react, deploy-config, db-schema | `../otp-worktrees/*` | in progress |
| 3 Backend (TDD) | Echo + hexagonal; JWT/JWKS middleware; `/healthz`, `/api/v1/me`, `/api/v1/organizations` | `backend-go/` | in progress |
| 4 Frontend | Vite+React+TS+Tailwind, react-oidc-context, Axios interceptor, protected route | `frontend-react/` | in progress |
| 5 Review/merge | Code review vs. Laravel flows; merge branches; remove worktrees | — | pending |
| 6 Infra | Nginx + Compose (FE, BE, PG, Keycloak realm import) + K8s manifests | `deploy/` | in progress |

## Module roadmap after foundation (each = brainstorm → plan → TDD → review)
1. Identity/Admin master data (orgs, zones, subzones, users, roles) + LINE login/linking
2. Inventory (pilot, low risk) 3. FoodWaste 4. KeptKaya + AnnualTrash + Welfare 5. Tabwater (money; golden tests vs Laravel + parallel run) 6. Kiosk/IoT, reports (PDF/Excel), schedulers
Cutover (per module, ≤60 min write-downtime, off-hours): see analysis plan §4.4.

## Definition of done (per slice)
- Tests written first (red → green), `go test ./...` / `npm test` pass; lint clean
- Runs in `docker compose up` end to end; no hardcoded secrets/URLs (env/ConfigMap/Secret only)
- Behaviour compared against the Laravel original (Phase 5)

## Known security issues in legacy (do NOT port; fix in legacy now)
- LINE: `dashboard($pref_id)` auto-login from URL; `handleLineLogin` trusts client `userId`
- `SuperAdminAuthController` hardcoded credentials; `OrgSelectorController` overwrites `users.org_id_fk`
