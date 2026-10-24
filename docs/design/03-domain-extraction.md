# Phase 1.3 — Domain Logic Extraction & Hexagonal Architecture

## 1. Hexagonal Structure (Ports & Adapters)

```
backend-go/
├── cmd/api/main.go                      # Composition root (wires adapters -> use cases)
├── internal/
│   ├── domain/                          # Pure business entities, value objects, domain errors (zero external deps)
│   ├── app/                             # Application layer: Use Cases + Inbound/Outbound Port interfaces
│   └── adapter/
│       ├── in/http/                     # Driving adapter: Echo handlers, JWT/RBAC middleware, DTO mappers
│       └── out/
│           ├── keycloak/                # Driven adapter: JWKS client & RS256 JWT verifier
│           └── postgres/                # Driven adapter: pgxpool repositories
└── pkg/
    └── problem/                         # RFC 7807 Problem Details helper
```

**Dependency Rule**: `adapter` → `app` → `domain`. Inner layers never import outer layers (`echo`, `pgx`, `jwt`).

## 2. Foundation Vertical Slice (Implemented in Phase 3)
Extracted from Laravel `App\Models\Admin\Organization`, `App\Http\Controllers\Admin\OrgSelectorController`, and `App\Traits\BelongsToOrganization`:
- **Domain Entities**: `Principal` (`Sub`, `Username`, `Roles`, `OrgID`), `Organization` (`ID`, `Code`, `Name`, `TypeID`).
- **Ports**:
  - `TokenVerifier`: `Verify(ctx, rawToken) (*Principal, error)`
  - `OrganizationRepository`: `ListAll(ctx) ([]Organization, error)`, `GetByID(ctx, id int64) (*Organization, error)`
  - `HealthChecker`: `Ping(ctx) error`
- **Use Case (`OrganizationService.ListForPrincipal`)**:
  - Requires role `admin` or `super_admin` (returns `ErrForbidden` otherwise).
  - If `principal.HasRole("super_admin")`, returns all organizations (`ListAll`).
  - Otherwise, enforces tenant isolation: requires `principal.OrgID != nil` and returns only the principal's organization (`GetByID(*principal.OrgID)`).

## 3. Legacy Laravel → Go Use Case Extraction Catalogue (Next Slices)

| Bounded Context | Legacy Laravel Controllers / Models | Target Go Use Cases (`internal/<context>/app`) | Key Domain Rules Extracted |
|---|---|---|---|
| **Identity & Admin** | `SuperUserController`, `UserController`, `RoleController`, `TambonsController`, `LineLiffController` | `GetMe`, `ListOrganizations`, `ManageUsers`, `LinkLineAccount`, `ListGeoMaster` | Tenant scoping (`org_id`), role normalization, ownership-verified LINE account linking (password / staff one-time code / approval queue) |
| **Inventory (Pilot)** | `InvItemController`, `InvStockController`, `InvTransactionController`, `ApprovalWorkflow` | `CreateItem`, `RecordStockTransaction`, `ApproveTransaction`, `RejectTransaction` | Multi-step approval state machine, hazard level rules, non-negative stock invariant |
| **FoodWaste** | `BinsController`, `FoodwastIotboxController`, `AiroBactController`, `EmissionFactorController` | `RegisterBin`, `MatchUserIotBox`, `IngestSensorData`, `RecordCompostBatch`, `CalculateEmissionImpact` | Carbon emission factor calculation, IoT box pairing uniqueness |
| **KeptKaya & Welfare** | `KpPurchaseController`, `KpSellController`, `KpWithdrawBatchController`, `WelfareController`, `AnnualTrashController` | `PurchaseRecyclables`, `BulkSellRecyclables`, `RequestWithdrawal`, `ApproveWithdrawBatch`, `CalculateAnnualTrashFee`, `ProcessWelfarePayout` | Append-only point/money ledger, price-and-point tier lookup by date/group, annual fee waiver compliance check |
| **Tabwater** | `TwMeterReadingController`, `InvoiceController`, `TwPaymentController`, `CutmeterController`, `TabwaterStationController` | `RecordMeterReading`, `GeneratePeriodInvoices`, `CalculateTieredWaterBill`, `ReceiveInvoicePayment`, `IssueOwePaper`, `OrderCutMeter`, `LogWaterQuality` | Progressive tiered water pricing (`tw_meter_type_rate_tiers`) + VAT + reserve meter fee, idempotent invoice generation per period/subzone, running balance ledger |
