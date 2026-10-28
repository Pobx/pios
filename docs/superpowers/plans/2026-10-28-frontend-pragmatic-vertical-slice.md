# Frontend Pragmatic Vertical Slice Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `frontend-react` from a monolithic module structure (`src/features/modules/ModulesPages.tsx` ~1,788 lines) into clean, independent Pragmatic Vertical Slices in TypeScript with collocated types, API, hooks, and UI components.

**Architecture:** Vertical Slice Architecture where each municipal feature slice (`tabwater`, `recycle-bank`, `foodwaste`, `inventory`, `users`, `resident`) encapsulates its own business domain, types, API endpoints, React Query hooks, and presentation components. Shared design primitives (`StatusBadge`, `ModuleHeader`, CSV export) move to `src/shared/`.

**Tech Stack:** React 18, TypeScript 5, Vite, Tailwind CSS, TanStack React Query v5, Axios, Vitest, React Testing Library.

**Spec:** `/Users/poppy.geidtiphong/.gemini/antigravity/brain/87f79c4c-858e-40cd-8f49-a05f80803b36/design_pragmatic_vertical_slice.md`

## Global Constraints

- Preserve all 42 Vitest tests and ensure 100% pass rate at every task.
- Zero TypeScript build errors (`tsc --noEmit && vite build`).
- Do not modify backend endpoints or OIDC authentication contracts.
- Use explicit TypeScript interfaces for all DTOs and entity models.
- All slice inter-dependencies must go through public barrel exports (`index.ts`).

## Review Focus

1. **Role Guard Regression:** Ensure route guards in `router.tsx` and `Layout.tsx` correctly point to new slice pages and preserve role protections (`super_admin`, `admin`, staff roles).
2. **React Query Cache Invalidation:** Verify that mutations within slices (e.g. `recordTabwaterReading`, `createInventoryTransaction`) correctly invalidate active query keys.
3. **Modal & Form State:** Ensure modal popups (recording readings, adding items, linking LINE accounts) close smoothly upon successful API mutation.
4. **CSV Export Utility:** Ensure export functionality continues to generate proper CSV blobs with UTF-8 BOM encoding for Thai language support.
5. **Mobile Viewport Usability:** Ensure new sliced pages maintain the mobile-friendly styles and layout padding established in `Layout.tsx`.

---

### Task 1: Extract Shared UI Primitives & Utilities

**Files:**
- Create: `frontend-react/src/shared/ui/StatusBadge.tsx`
- Create: `frontend-react/src/shared/ui/ModuleHeader.tsx`
- Create: `frontend-react/src/shared/ui/buttonStyles.ts`
- Create: `frontend-react/src/shared/utils/csv.ts`

- [ ] **Step 1: Create `src/shared/ui/StatusBadge.tsx`**
  Extract `StatusBadge` from `ModulesPages.tsx` with full TypeScript props (`value: string`, optional `className?: string`).
- [ ] **Step 2: Create `src/shared/ui/ModuleHeader.tsx`**
  Extract `ModuleHeader` with props (`badge: string`, `title: string`, `subtitle: string`, `right?: React.ReactNode`).
- [ ] **Step 3: Create `src/shared/ui/buttonStyles.ts`**
  Export standard design tokens (`INPUT_CLS`, `BTN_PRIMARY`, `BTN_EMERALD`, `BTN_AMBER`, `BTN_SECONDARY`).
- [ ] **Step 4: Create `src/shared/utils/csv.ts`**
  Extract `exportRowsToCsv(filename: string, headers: string[], rows: (string | number)[][])`.
- [ ] **Step 5: Run tests to verify extraction**
  Run `npm test --prefix frontend-react`.

---

### Task 2: Vertical Slice: `features/tabwater`

**Files:**
- Create: `frontend-react/src/features/tabwater/types.ts`
- Create: `frontend-react/src/features/tabwater/api/tabwaterApi.ts`
- Create: `frontend-react/src/features/tabwater/hooks/useTabwater.ts`
- Create: `frontend-react/src/features/tabwater/pages/TabwaterPage.tsx`
- Create: `frontend-react/src/features/tabwater/index.ts`

- [ ] **Step 1: Define TypeScript types**
  In `types.ts`, define `WaterMeter`, `WaterPeriod`, `WaterInvoice`, `TabwaterSection`, and mutation payload types.
- [ ] **Step 2: Implement API layer**
  In `api/tabwaterApi.ts`, implement `fetchTabwaterMeters`, `createTabwaterMeter`, `fetchTabwaterPeriods`, `createTabwaterPeriod`, `fetchTabwaterInvoices`, `recordTabwaterReading`, `payTabwaterInvoice`.
- [ ] **Step 3: Implement custom hooks**
  In `hooks/useTabwater.ts`, wrap API calls with React Query (`useQuery`, `useMutation`) and proper query cache invalidation on keys `['tabwater-meters']`, `['tabwater-periods']`, `['tabwater-invoices']`.
- [ ] **Step 4: Implement `TabwaterPage.tsx`**
  Refactor `TabwaterPage` using the new hooks, shared UI primitives, and clean section navigation.
- [ ] **Step 5: Export public API in `index.ts`**
  Export `TabwaterPage` and public types.
- [ ] **Step 6: Run tests to ensure zero regressions**
  Run `npm test --prefix frontend-react`.

---

### Task 3: Vertical Slice: `features/recycle-bank`

**Files:**
- Create: `frontend-react/src/features/recycle-bank/types.ts`
- Create: `frontend-react/src/features/recycle-bank/api/recycleApi.ts`
- Create: `frontend-react/src/features/recycle-bank/hooks/useRecycle.ts`
- Create: `frontend-react/src/features/recycle-bank/pages/RecycleBankPage.tsx`
- Create: `frontend-react/src/features/recycle-bank/index.ts`

- [ ] **Step 1: Define TypeScript types**
  In `types.ts`, define `RecycleItem`, `RecycleAccount`, `RecycleSubmodulesSummary`, `RecycleSection`, and transaction payloads.
- [ ] **Step 2: Implement API layer**
  In `api/recycleApi.ts`, implement `fetchRecycleItems`, `setRecycleItemPrice`, `fetchRecycleAccounts`, `withdrawRecycleBalance`, `fetchRecycleSubmodules`, `recordRecyclePurchase`.
- [ ] **Step 3: Implement custom hooks**
  In `hooks/useRecycle.ts`, implement React Query hooks with cache keys `['recycle-items']`, `['recycle-accounts']`, `['recycle-submodules']`.
- [ ] **Step 4: Implement `RecycleBankPage.tsx`**
  Migrate KeptKaya UI, daily purchase pricing table, member savings ledger, and IoT kiosk status card.
- [ ] **Step 5: Export public API in `index.ts`**
  Export `RecycleBankPage` and public types.
- [ ] **Step 6: Run tests**
  Run `npm test --prefix frontend-react`.

---

### Task 4: Vertical Slice: `features/foodwaste`

**Files:**
- Create: `frontend-react/src/features/foodwaste/types.ts`
- Create: `frontend-react/src/features/foodwaste/api/foodwasteApi.ts`
- Create: `frontend-react/src/features/foodwaste/hooks/useFoodWaste.ts`
- Create: `frontend-react/src/features/foodwaste/pages/FoodWastePage.tsx`
- Create: `frontend-react/src/features/foodwaste/index.ts`

- [ ] **Step 1: Define TypeScript types**
  In `types.ts`, define `CompostBatch`, `WasteLog`, `FoodWasteSummary`, `FoodWasteSection`.
- [ ] **Step 2: Implement API layer**
  In `api/foodwasteApi.ts`, implement `fetchFoodWasteSummary`, `createCompostBatch`, `createWasteLog`.
- [ ] **Step 3: Implement custom hooks**
  In `hooks/useFoodWaste.ts`, implement `useFoodWasteSummary`, `useCreateCompostBatch`, `useCreateWasteLog` with cache key `['foodwaste-summary']`.
- [ ] **Step 4: Implement `FoodWastePage.tsx`**
  Migrate compost batch logging, organic waste weight records, and TGO carbon credit metrics ($kgCO_2e$).
- [ ] **Step 5: Export public API in `index.ts`**
  Export `FoodWastePage` and public types.
- [ ] **Step 6: Run tests**
  Run `npm test --prefix frontend-react`.

---

### Task 5: Vertical Slice: `features/inventory`

**Files:**
- Create: `frontend-react/src/features/inventory/types.ts`
- Create: `frontend-react/src/features/inventory/api/inventoryApi.ts`
- Create: `frontend-react/src/features/inventory/hooks/useInventory.ts`
- Create: `frontend-react/src/features/inventory/pages/InventoryPage.tsx`
- Create: `frontend-react/src/features/inventory/index.ts`

- [ ] **Step 1: Define TypeScript types**
  In `types.ts`, define `InventoryItem`, `InventoryTransaction`, `InventorySection`, and request payloads.
- [ ] **Step 2: Implement API layer**
  In `api/inventoryApi.ts`, implement `fetchInventoryItems`, `createInventoryItem`, `fetchInventoryTransactions`, `createInventoryTransaction`, `decideInventoryTransaction`.
- [ ] **Step 3: Implement custom hooks**
  In `hooks/useInventory.ts`, implement React Query hooks with cache keys `['inventory-items']`, `['inventory-transactions']`.
- [ ] **Step 4: Implement `InventoryPage.tsx`**
  Migrate inventory stock catalog, chemical stock management, and multi-tier approval workflow queue.
- [ ] **Step 5: Export public API in `index.ts`**
  Export `InventoryPage` and public types.
- [ ] **Step 6: Run tests**
  Run `npm test --prefix frontend-react`.

---

### Task 6: Vertical Slice: `features/users`

**Files:**
- Create: `frontend-react/src/features/users/types.ts`
- Create: `frontend-react/src/features/users/api/usersApi.ts`
- Create: `frontend-react/src/features/users/hooks/useUsers.ts`
- Create: `frontend-react/src/features/users/pages/UsersPage.tsx`
- Create: `frontend-react/src/features/users/index.ts`

- [ ] **Step 1: Define TypeScript types**
  In `types.ts`, define `User`, `Zone`, `UsersSection`, `CreateUserPayload`, `LineLinkPayload`.
- [ ] **Step 2: Implement API layer**
  In `api/usersApi.ts`, implement `fetchUsers`, `createUser`, `fetchZones`, `createZone`, `linkUserLineAccount`.
- [ ] **Step 3: Implement custom hooks**
  In `hooks/useUsers.ts`, implement React Query hooks with cache keys `['users']`, `['zones']`.
- [ ] **Step 4: Implement `UsersPage.tsx`**
  Migrate resident registration, village zones configuration, and LINE OA account linking interface.
- [ ] **Step 5: Export public API in `index.ts`**
  Export `UsersPage` and public types.
- [ ] **Step 6: Run tests**
  Run `npm test --prefix frontend-react`.

---

### Task 7: Vertical Slice: `features/resident`

**Files:**
- Create: `frontend-react/src/features/resident/types.ts`
- Create: `frontend-react/src/features/resident/api/residentApi.ts`
- Create: `frontend-react/src/features/resident/hooks/useResident.ts`
- Create: `frontend-react/src/features/resident/pages/ResidentPage.tsx`
- Create: `frontend-react/src/features/resident/index.ts`

- [ ] **Step 1: Define TypeScript types**
  In `types.ts`, define `ResidentOverview`, `ResidentWaterReading`, `ResidentInvoiceSummary`.
- [ ] **Step 2: Implement API layer**
  In `api/residentApi.ts`, implement `fetchResidentOverview`.
- [ ] **Step 3: Implement custom hooks**
  In `hooks/useResident.ts`, implement `useResidentOverview` with cache key `['resident-overview']`.
- [ ] **Step 4: Implement `ResidentPage.tsx`**
  Migrate resident digital ledger, water invoice history, and KeptKaya waste bank balance display.
- [ ] **Step 5: Export public API in `index.ts`**
  Export `ResidentPage` and public types.
- [ ] **Step 6: Run tests**
  Run `npm test --prefix frontend-react`.

---

### Task 8: Router Rewiring & Monolith Decommissioning

**Files:**
- Modify: `frontend-react/src/app/router.tsx`
- Delete: `frontend-react/src/features/modules/ModulesPages.tsx`
- Delete: `frontend-react/src/features/modules/api.ts`
- Modify / Migrate: `frontend-react/src/features/modules/ModulesPages.test.tsx`

- [ ] **Step 1: Rewire `src/app/router.tsx`**
  Update page imports to import directly from the new vertical slices:
  - `import { TabwaterPage } from '@/features/tabwater'`
  - `import { RecycleBankPage } from '@/features/recycle-bank'`
  - `import { FoodWastePage } from '@/features/foodwaste'`
  - `import { InventoryPage } from '@/features/inventory'`
  - `import { UsersPage } from '@/features/users'`
  - `import { ResidentPage } from '@/features/resident'`
- [ ] **Step 2: Update tests**
  Ensure test suites (including `ModulesPages.test.tsx` and `app.e2e.test.tsx`) reference the new slice paths or export aliases.
- [ ] **Step 3: Remove legacy `src/features/modules/` directory**
  Delete the obsolete 1,788-line `ModulesPages.tsx` and legacy `api.ts`.
- [ ] **Step 4: Run full test suite & production build**
  Run:
  - `npm test --prefix frontend-react` (ensure 42/42 tests pass)
  - `npm run build --prefix frontend-react` (ensure TypeScript and Vite build pass)
