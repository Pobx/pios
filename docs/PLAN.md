# OTP Migration — Master Plan (Execution Completed)

Source of truth for scope: `../requirement.md` (ADLC, 6 phases). Analysis background: Laravel project `homework/otp2025` (+ production dump in `docs/`, git-ignored).

## Assumptions & Architecture Decisions
| # | Decision | Why / Impact |
|---|---|---|
| A1 | **Tenancy = shared schema + normalized `org_id` on every org-owned table + application/RLS isolation** | Legacy Laravel ran one DB with `org_id_fk` (47 tables normalized to `org_id` during migration). Prod dump = one DB, 3 organizations (`HSG1`, `TNG1`, `KUCSC`). |
| A2 | Source schema = production dump (MariaDB 11.8, 110 tables) | All 110 tables + production dump rows converted and loaded into PostgreSQL 16 (`tools/mysql2pg`). |
| A3 | Zero-data-loss cutover within 60-minute window | Automated schema conversion, bulk load, sequence reset, and financial/row-count reconciliation (`tools/cutover/verify_integrity.py`). |
| A4 | Full-Stack Hexagonal Go + React 18 SPA | Implemented foundation + all 5 Business Waves (Identity/Resident/LINE Linking, Inventory, FoodWaste, KeptKaya/Recycle/Kiosk/Welfare/AnnualTrash, Tabwater + CSV/Printable Receipts). |
| A5 | Ownership-verified LINE account linking + Keycloak OIDC | Replaced insecure URL auto-login and unverified client `userId` trust with Keycloak 26 OIDC PKCE + staff verification code (`tools/keycloak_sync/export_users.py`). |
| A6 | Local = Docker Compose (Nginx, FE, BE, PG, Keycloak). Prod = K8s manifests, Postgres external (RDS/Bare Metal) | Per `requirement.md`. |
| A7 | Plain K8s YAML (`deploy/k8s/*.yaml`) | Per `requirement.md` structure. |

## Phases → Status
| Phase | Deliverable | Location | Status |
|---|---|---|---|
| 1.1 DB schema | Mapping rules + generated PG baseline DDL from dump (110 tables), loaded in local PG | `docs/design/01-postgres-schema.md`, `backend-go/db/migrations`, `tools/mysql2pg` | **done** |
| 1.2 Auth flow | OIDC PKCE + JWKS design doc & Keycloak user sync | `docs/design/02-auth-flow.md`, `tools/keycloak_sync/export_users.py` | **done** |
| 1.3 Domain extraction | Module inventory + use-case catalogue across all 5 Waves | `docs/design/03-domain-extraction.md` | **done** |
| 2 Workspaces | Parallel git worktrees created, implemented, reviewed, and merged to `main` | `main` branch | **done** |
| 3 Backend (TDD) | Echo v4 + Hexagonal; RS256 JWKS middleware; all Read/Write/Approval/Report endpoints across Waves 1–5 | `backend-go/` | **done** |
| 4 Frontend | Vite + React 18 + TS + Tailwind, `react-oidc-context`, Axios interceptor, all 5 Wave pages + Printable Receipts + CSV export | `frontend-react/` | **done** |
| 5 Review/merge | Code review vs. Laravel flows; security fixes verified; branches merged; worktrees cleaned | `main` branch | **done** |
| 6 Infra & CI | Nginx + Compose (FE, BE, PG, Keycloak realm import) + K8s manifests + GitHub Actions CI + Cutover Verifier | `deploy/`, `.github/workflows/ci.yml`, `tools/cutover/` | **done** |

## Business Waves Status
1. **Wave 1 & 1.5 (Identity, Organizations, Users, Zones, Resident Portal & Safe LINE Linking)**: **done**
2. **Wave 2 (Inventory Stock, Requests & Multi-Step Approval Workflow)**: **done**
3. **Wave 3 (FoodWaste Compost Batches, Waste Logs & Carbon Credit Calculation)**: **done**
4. **Wave 4 (KeptKaya Recycle Bank, Member Accounts, Purchases, IoT Kiosks, Welfare Fund & Annual Trash)**: **done**
5. **Wave 5 (Tabwater Meters, Progressive Tariff Calculation, Invoices, Payments, Printable Official Receipts & CSV Export)**: **done**

## Mandatory 4-Tier Testing Policy
- `make test-unit` — Go & React unit tests
- `make test-api-mock` — Go HTTP handler & Frontend API client tests with mocks
- `make test-api-integration` — Full-stack Go HTTP → Service → PostgreSQL 16 integration tests
- `make test-e2e-mock` — Full-app React Router + OIDC + API user journey E2E tests
