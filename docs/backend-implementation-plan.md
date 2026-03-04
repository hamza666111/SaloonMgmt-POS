# Saloon POS Backend Implementation Plan

## 1) Current State Audit Summary

The frontend has complete UI coverage but backend execution is mostly missing.

### Pages scanned (interactive controls + handlers)

- `AppointmentsPage.tsx` (52)
- `BranchSelectorPage.tsx` (3)
- `ClientProfilePage.tsx` (30)
- `ClientsPage.tsx` (27)
- `DashboardPage.tsx` (9)
- `ForgotPasswordPage.tsx` (9)
- `InventoryPage.tsx` (36)
- `InvoicesPage.tsx` (11)
- `LoginPage.tsx` (16)
- `MarketingPage.tsx` (40)
- `PayrollPage.tsx` (10)
- `POSPage.tsx` (88)
- `ReportsPage.tsx` (13)
- `SettingsPage.tsx` (101)
- `StaffPage.tsx` (22)
- `TwoFactorPage.tsx` (9)

### Non-page interactive wrappers

- `components/Layout.tsx` (44)
- `components/forms/StaffForm.tsx` (8)
- `components/layout/AppLayout.tsx` (5)

### Root gaps found

1. `src/app/lib/supabase.ts` is disabled (`supabase = null`), so app cannot use real backend.
2. Most pages import `mockData.ts` directly and perform local-only state transitions.
3. Login/auth, branch selection, role permission changes, and logout are mostly simulated.
4. POS checkout, refund, and split flows are not persisted transactionally.
5. Inventory adjustments and low-stock actions are placeholder-only.
6. Appointments lack robust overlap/conflict validation and atomic booking.
7. Dashboard/Reports/Invoices are mostly computed from static data, not live queries.
8. Settings and branch management are local-only persisted Zustand state.
9. No unified loading/error state conventions for data mutations across pages.
10. No offline mutation queue and sync lifecycle for disconnected mode.

---

## 2) Target System Architecture

### Frontend architecture

- **UI Layer**: existing page/components remain unchanged in design.
- **Data Facade Layer**: `src/app/lib/supabaseData.ts` becomes authoritative typed API for all pages.
- **Store Layer**: Zustand stores for auth/branch/pos/settings read/write through facade functions.
- **Sync Layer**: offline queue utility that stores failed mutations and auto-syncs when online.
- **Realtime Layer**: Supabase channel subscriptions for dashboard-relevant entities.

### Backend architecture (Supabase)

- **Auth**: Supabase Auth session + profile mapping in `users`.
- **Data**: PostgreSQL tables with strict branch-scoped access.
- **Security**: RLS for all transactional/business tables.
- **Business logic**: SQL functions/RPC for critical atomic workflows:
  - checkout transaction (sale + items + payment + inventory + client stats)
  - appointment scheduling with conflict detection
  - branch-scoped dashboard metrics

---

## 3) Database Schema Plan

### Existing core entities to use

- `branches`
- `roles`, `permissions`, `role_permissions`
- `users`
- `clients`
- `services`
- `products`
- `appointments`
- `sales`, `sale_items`, `payments`, `refunds`
- `payroll_records`
- `campaigns`
- `audit_logs`

### Planned schema hardening

1. Enable and complete RLS policies for all core tables (not only subset).
2. Add branch-scoped helper functions and policy predicates to avoid duplicated policy SQL.
3. Add appointment conflict constraint/index strategy:
   - overlap query index on (`barber_id`, `start_time`, `end_time`)
   - scheduling function that rejects overlaps and past slots.
4. Add transactional checkout RPC:
   - validates stock and line items
   - writes `sales`, `sale_items`, `payments`
   - decrements product stock atomically
   - updates client totals/visits
   - optional appointment status transition
5. Add settings persistence table (business/tax/booking/commission/branding/loyalty).
6. Add optional role-module overrides table for staff permission toggles UI.

---

## 4) UI → Backend Entity Mapping

### Authentication and Access

- `LoginPage`, `ForgotPasswordPage`, `TwoFactorPage`, `Layout` profile/logout
  - `auth.users`, `users`, `roles`, `role_permissions`

### Multi-branch

- `BranchSelectorPage`, branch switcher in `Layout`, settings branch management
  - `branches`, `users.branch_id`, branch-aware queries

### Clients

- `ClientsPage`, `ClientProfilePage`
  - `clients`, `sales`, `appointments`

### Appointments

- `AppointmentsPage`
  - `appointments`, `clients`, `users` (barbers), `services`

### POS + Invoice + Inventory

- `POSPage`
  - `sales`, `sale_items`, `payments`, `refunds`, `products`, `services`, `clients`
- `InvoicesPage`
  - `sales` + joined `sale_items`/`payments` + client/barber references
- `InventoryPage`
  - `products`, low stock views/queries

### Staff / Payroll / Roles

- `StaffPage`
  - `users`, role-module permissions
- `PayrollPage`
  - `payroll_records`, derived sale performance

### Marketing

- `MarketingPage`
  - `campaigns`

### Analytics

- `DashboardPage`, `ReportsPage`
  - `sales`, `appointments`, `products`, staff performance views

### Settings

- `SettingsPage`
  - settings table + `branches`

---

## 5) Edge Cases to Handle

1. Duplicate checkout submission (double-click) must be idempotent.
2. Product out-of-stock between cart load and payment confirm.
3. Appointment race conditions between two users booking same slot.
4. Branch mismatch access (user switching URL manually).
5. Null/empty values for optional fields (email, notes, membership).
6. Role downgrade should immediately limit accessible modules.
7. Offline mode mutation conflicts (same record changed remotely).
8. Realtime subscription reconnect/re-auth on token refresh.
9. Numeric parsing and rounding for tip/discount/tax totals.
10. Refund amount cannot exceed sale balance.

---

## 6) Implementation Sequence

1. Enable Supabase client and typed helpers.
2. Add robust facade in `supabaseData.ts` for all entities and workflows.
3. Add offline queue + sync utilities and wire mutation APIs.
4. Refactor auth and branch stores to real backend sessions/data.
5. Replace page-level `mockData` reads with facade loaders.
6. Replace placeholder action handlers with validated mutations.
7. Introduce consistent loading/error states for forms/modals/buttons.
8. Apply SQL policy/function updates for secure branch/role enforcement.
9. Validate build and remove backend-blocking dead paths.
