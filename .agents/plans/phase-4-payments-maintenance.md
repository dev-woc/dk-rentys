# Feature: Phase 4 — Rent Payments & Maintenance Requests

The following plan should be complete, but validate documentation and codebase patterns before implementing.

Pay special attention to numeric column handling (Drizzle returns `numeric` columns as strings — always `Number()` for display, `.toString()` when inserting), ownership check patterns, and the exact shape of existing composite types before adding to them.

## Feature Description

Two parallel feature tracks: (1) Rent payment tracking — landlords manually record payments, mark them paid/late, and view history per tenant and across the portfolio. (2) Maintenance request management — log repair requests per unit, advance them through a status workflow, and optionally assign a vendor. Both tracks have a dedicated list page accessible from the nav and a panel embedded in relevant detail pages.

## User Story

As a landlord  
I want to record rent payments and track maintenance requests across my portfolio  
So that I know who's paid, who's overdue, and what repairs are pending — all in one place

## Problem Statement

After Phase 3, the app tracks tenants and leases but has no way to record that rent was actually collected or that a maintenance issue was opened. Landlords are still juggling spreadsheets or memory for these day-to-day operations.

## Solution Statement

Add full CRUD APIs for `payments` and `maintenanceRequests` + `vendors` (already in schema). Wire a Payments panel into the tenant detail page and a standalone Payments list page. Add a Maintenance list page with status workflow and vendor assignment. Add both to nav.

## Feature Metadata

**Feature Type**: New Capability  
**Estimated Complexity**: Medium  
**Primary Systems Affected**: payments, maintenanceRequests, vendors tables; tenant detail page; dashboard; nav  
**Dependencies**: All already installed — no new packages needed

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `src/lib/db/schema.ts` (lines 179–265) — `payments`, `maintenanceRequests`, `vendors`, `expenses` table definitions + all relations
- `src/lib/validations.ts` (lines for paymentSchema, paymentStatusSchema, maintenanceRequestSchema, maintenanceStatusSchema, vendorSchema) — all validation schemas already written
- `src/types/index.ts` — all base types + `TenantWithDetails` composite type to extend
- `src/app/api/leases/[id]/route.ts` — canonical `resolveLease` helper pattern (lines 9–27) — mirror for `resolvePayment` and `resolveMaintenance`
- `src/app/api/properties/[id]/route.ts` — canonical `resolveOwner` helper pattern
- `src/app/api/tenants/[id]/route.ts` — two-level ownership check via `with: { unit: { with: { property: true } } }`
- `src/app/api/tenants/[id]/vehicles/[vehicleId]/route.ts` — vehicle ownership via tenant join
- `src/components/tenants/vehicle-list.tsx` — list panel pattern with add/edit/delete inline (mirror for PaymentList, MaintenanceList)
- `src/components/tenants/lease-form.tsx` — dialog form pattern with Select + numeric inputs
- `src/components/tenants/lease-badge.tsx` — status badge pattern — mirror for PaymentBadge and UrgencyBadge
- `src/app/(dashboard)/tenants/[id]/tenant-detail-client.tsx` — how to embed a new panel section
- `src/app/(dashboard)/layout.tsx` — NAV_LINKS array to add new entries
- `src/app/(dashboard)/dashboard/page.tsx` — dashboard stats + panels pattern (server component)
- `src/components/dashboard/stat-card.tsx` — StatCard for dashboard updates

### New Files to Create

**API:**
- `src/app/api/payments/route.ts` — GET all owner payments, POST create
- `src/app/api/payments/[id]/route.ts` — PUT update, DELETE
- `src/app/api/maintenance/route.ts` — GET all owner maintenance requests, POST create
- `src/app/api/maintenance/[id]/route.ts` — GET single, PUT update (including status), DELETE
- `src/app/api/vendors/route.ts` — GET list, POST create
- `src/app/api/vendors/[id]/route.ts` — PUT update, DELETE

**Components:**
- `src/components/payments/payment-badge.tsx` — status badge (pending/paid/late/partial/failed)
- `src/components/payments/payment-form.tsx` — add/edit payment dialog
- `src/components/payments/payment-list.tsx` — payment panel for tenant detail (mirrors VehicleList)
- `src/components/maintenance/urgency-badge.tsx` — urgency badge (Emergency/Urgent/Routine)
- `src/components/maintenance/maintenance-form.tsx` — add/edit maintenance request dialog
- `src/components/maintenance/maintenance-list.tsx` — maintenance panel (reusable)
- `src/components/maintenance/status-update-form.tsx` — inline status update dialog
- `src/components/vendors/vendor-form.tsx` — add/edit vendor dialog

**Pages:**
- `src/app/(dashboard)/payments/page.tsx` — payments list page (server component shell)
- `src/app/(dashboard)/payments/payments-client.tsx` — client with filter/sort
- `src/app/(dashboard)/maintenance/page.tsx` — maintenance list page (server component shell)
- `src/app/(dashboard)/maintenance/maintenance-client.tsx` — client with filter/sort
- `src/app/(dashboard)/maintenance/vendors/page.tsx` — vendors list page shell
- `src/app/(dashboard)/maintenance/vendors/vendors-client.tsx` — vendors client

### Relevant Documentation

- Drizzle ORM RQB docs: nested `with` syntax — already used in codebase, no new patterns needed
- Zod v4 — already in use, schemas already written in `validations.ts`
- lucide-react icons already installed — use `DollarSign`, `Wrench`, `CheckCircle`, `Clock`, `AlertTriangle` etc.
- recharts is installed but not needed in this phase

### Patterns to Follow

**resolveX helper** (from `src/app/api/leases/[id]/route.ts`):
```ts
async function resolvePayment(request: NextRequest, paymentId: string) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = apiRateLimiter.check(ip);
  if (!success) return { error: "Too many requests", status: 429 };
  const { data } = await auth.getSession();
  if (!data?.user) return { error: "Unauthorized", status: 401 };
  const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId),
    with: { tenant: true },
  });
  if (!payment || payment.tenant.ownerId !== owner.id)
    return { error: "Not found", status: 404 };
  return { payment, owner };
}
```

**Ownership for payments** — payments have `tenantId`; tenants have `ownerId`. Check `payment.tenant.ownerId !== owner.id`.

**Ownership for maintenance** — maintenanceRequests have `unitId`; units belong to properties with `ownerId`. Check via `with: { unit: { with: { property: true } } }`, then `request.unit.property.ownerId !== owner.id`.

**Ownership for vendors** — directly `vendor.ownerId === owner.id` (same as properties/tenants).

**GET all payments for owner** — fetch all owner's tenant IDs first, then query by tenantId:
```ts
const ownerTenants = await db.query.tenants.findMany({
  where: eq(tenants.ownerId, owner.id),
  columns: { id: true },
});
const tenantIds = ownerTenants.map(t => t.id);
const ownerPayments = tenantIds.length > 0
  ? await db.query.payments.findMany({
      where: inArray(payments.tenantId, tenantIds),
      with: { tenant: true, unit: { with: { property: true } } },
      orderBy: (p, { desc }) => [desc(p.dueDate)],
    })
  : [];
```

**GET all maintenance for owner** — same pattern: get unitIds from owner's properties, then `inArray(maintenanceRequests.unitId, unitIds)`.

**Numeric columns** — `amount`, `lateFeeAmount`, `budget`, `cost` return as strings:
- Display: `Number(payment.amount).toLocaleString()`
- Insert/update: `result.data.amount.toString()`

**Badge pattern** (from `src/components/tenants/lease-badge.tsx`):
```tsx
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const variants: Record<PaymentStatus, string> = {
    paid: "default",
    pending: "secondary",
    late: "destructive",
    partial: "outline",
    failed: "destructive",
  };
  const labels: Record<PaymentStatus, string> = { ... };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
```

**Panel pattern** (from `src/components/tenants/vehicle-list.tsx`) — a client component with:
- `useState` for editItem, addOpen, deletingId
- `onMutate` callback to re-fetch parent
- `divide-y rounded-lg border` list, `flex items-center justify-between px-4 py-3` row

**Form pattern** (from `src/components/tenants/lease-form.tsx`) — Dialog wrapper, `handleSubmit(e: React.FormEvent<HTMLFormElement>)`, `new FormData(form)`, `fd.get("field")`.

**Naming conventions**: PascalCase components, camelCase utils, kebab-case file names for components, `[id]` dynamic route segments.

---

## IMPLEMENTATION PLAN

### Phase 1: Types & Validation (no new schemas needed — all exist)

Extend `TenantWithDetails` in `src/types/index.ts` to include payments, and add new composite types.

### Phase 2: Payments API + UI

Full CRUD for payments. Embed PaymentList in tenant detail. Add payments list page.

### Phase 3: Maintenance + Vendor API + UI

Full CRUD for maintenance requests (with status workflow) and vendors. Add maintenance list page.

### Phase 4: Dashboard + Nav Updates

Add payment and maintenance stats to dashboard. Add nav links.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom.

---

### Task 1: UPDATE `src/types/index.ts`

- **ADD** new composite types after existing ones:
  ```ts
  export interface PaymentWithDetails extends Payment {
    tenant: Tenant;
    unit: Unit & { property: Property };
  }

  export interface MaintenanceRequestWithDetails extends MaintenanceRequest {
    unit: Unit & { property: Property };
    tenant?: Tenant | null;
    vendor?: Vendor | null;
  }
  ```
- **UPDATE** `TenantWithDetails` to add `payments: Payment[]`:
  ```ts
  export interface TenantWithDetails extends Tenant {
    vehicles: Vehicle[];
    leases: Lease[];
    payments: Payment[];  // ADD THIS
    unit?: (Unit & { property: Property }) | null;
  }
  ```
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 2: UPDATE `src/app/api/tenants/[id]/route.ts`

- **UPDATE** the GET handler's `with` clause to include payments:
  ```ts
  with: { vehicles: true, leases: true, payments: true, unit: { with: { property: true } } }
  ```
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 3: CREATE `src/app/api/payments/route.ts`

- **IMPLEMENT** GET handler:
  - `resolveOwner` pattern (inline, not extracted) — same as `src/app/api/leases/route.ts`
  - Fetch owner's tenant IDs: `db.query.tenants.findMany({ where: eq(tenants.ownerId, owner.id), columns: { id: true } })`
  - If no tenants, return `{ payments: [] }`
  - Query payments with `inArray(payments.tenantId, tenantIds)` + `with: { tenant: true, unit: { with: { property: true } } }` + `orderBy: (p, { desc }) => [desc(p.dueDate)]`
  - Return `{ payments }`
- **IMPLEMENT** POST handler:
  - Require `tenantId` and `unitId` in body
  - Verify tenant ownership: `db.query.tenants.findFirst({ where: and(eq(tenants.id, body.tenantId), eq(tenants.ownerId, owner.id)) })`
  - If not found → 404
  - Validate with `paymentSchema`
  - Insert with `amount: result.data.amount.toString()`, `lateFeeAmount: "0"`, `status: "pending"`
  - Return `{ payment }` with 201
- **IMPORTS**: `inArray, and, eq` from `drizzle-orm`; `payments, tenants` from schema; `paymentSchema` from validations
- **GOTCHA**: `inArray` requires a non-empty array — guard with `if (tenantIds.length === 0) return NextResponse.json({ payments: [] })`
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 4: CREATE `src/app/api/payments/[id]/route.ts`

- **IMPLEMENT** `resolvePayment(request, paymentId)` helper — mirrors `resolveLease` in `src/app/api/leases/[id]/route.ts`:
  - Fetch payment with `with: { tenant: true }`
  - Check `payment.tenant.ownerId !== owner.id` → 404
  - Returns `{ payment, owner }`
- **IMPLEMENT** PUT handler:
  - Call `resolvePayment`
  - Accept body with all `paymentSchema` fields + optional `status` (from `paymentStatusSchema.shape.status`) + `paidDate` + `lateFeeAmount`
  - Validate `paymentSchema` fields via `paymentSchema.safeParse(body)`
  - Update: `amount`, `dueDate`, `method`, `notes`, `status: body.status ?? payment.status`, `paidDate: body.paidDate ?? null`, `lateFeeAmount: (body.lateFeeAmount ?? 0).toString()`, `updatedAt: new Date()`
- **IMPLEMENT** DELETE handler — delete by id, no returning needed
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 5: CREATE `src/components/payments/payment-badge.tsx`

- **IMPLEMENT** `PaymentBadge` — mirrors `LeaseBadge` in `src/components/tenants/lease-badge.tsx`
- Badge `variant` map:
  - `paid` → `"default"` (green-ish / filled)
  - `pending` → `"secondary"`
  - `late` → `"destructive"`
  - `partial` → `"outline"`
  - `failed` → `"destructive"`
- Label map: `paid: "Paid"`, `pending: "Due"`, `late: "Late"`, `partial: "Partial"`, `failed: "Failed"`
- Props: `{ status: PaymentStatus }`
- **IMPORTS**: `Badge` from `@/components/ui/badge`; `PaymentStatus` from `@/types`
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 6: CREATE `src/components/payments/payment-form.tsx`

- **IMPLEMENT** add/edit payment dialog — mirrors `src/components/tenants/lease-form.tsx`
- Props: `{ open, onOpenChange, tenantId, unitId, payment?: Payment, onSuccess }`
- Fields:
  - `amount` — `type="number"` `min="0"` `step="0.01"` required
  - `dueDate` — `type="date"` required
  - `method` — `Select` with options from `PaymentMethod`: ach, card, cash, check, zelle, venmo, other
  - `notes` — text Input
  - When editing: `status` — `Select` with all `PaymentStatus` values + `paidDate` date input (shown when status = paid/partial)
- POST to `/api/payments` with `{ tenantId, unitId, amount, dueDate, method, notes }`
- PUT to `/api/payments/${payment.id}` with same + `status`, `paidDate`
- **GOTCHA**: `isEdit = !!payment`; don't show status selector when adding (always starts pending)
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 7: CREATE `src/components/payments/payment-list.tsx`

- **IMPLEMENT** client component — mirrors `src/components/tenants/vehicle-list.tsx`
- Props: `{ tenantId: string; unitId: string; payments: Payment[]; onMutate: () => void }`
- Renders: section header "Payments" + "Add Payment" button
- Each row: due date, amount (`$${Number(p.amount).toLocaleString()}`), `PaymentBadge`, paid date if present, Edit + Delete buttons
- Sort payments: unpaid first (pending/late at top), then by dueDate desc
- Delete: `DELETE /api/payments/${paymentId}` then `onMutate()`
- Edit: opens `PaymentForm` with `payment` prop
- Add: opens `PaymentForm` without `payment` prop
- **IMPORTS**: `Payment` from `@/types`; `PaymentForm` from `./payment-form`; `PaymentBadge` from `./payment-badge`
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 8: UPDATE `src/app/(dashboard)/tenants/[id]/tenant-detail-client.tsx`

- **ADD** `PaymentList` import from `@/components/payments/payment-list`
- **UPDATE** `fetchTenant` — no change needed (tenant API now returns `payments`)
- **UPDATE** `TenantWithDetails` usage — already has `payments: Payment[]` after Task 1
- **ADD** PaymentList section after VehicleList section:
  ```tsx
  {tenant.unit && (
    <PaymentList
      tenantId={tenant.id}
      unitId={tenant.unit.id}
      payments={tenant.payments}
      onMutate={fetchTenant}
    />
  )}
  ```
- Show section only if tenant has a unit (same guard used for LeaseForm)
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 9: CREATE `src/app/(dashboard)/payments/page.tsx` (server shell)

- **PATTERN**: mirror `src/app/(dashboard)/tenants/[id]/page.tsx`
- Renders `<PaymentsClient />`
- **NO** `export const dynamic` needed — PaymentsClient is client component

---

### Task 10: CREATE `src/app/(dashboard)/payments/payments-client.tsx`

- **IMPLEMENT** client component
- `useState` for payments list, loading, statusFilter (`"all" | PaymentStatus`), addOpen
- `useEffect` fetches `GET /api/payments`
- Filter UI: row of buttons/tabs for All / Due / Late / Paid
- Each row: tenant name (link to `/tenants/${p.tenantId}`), unit + property label, amount, due date, `PaymentBadge`, paid date
- "Add Payment" button — opens `PaymentForm` (needs tenantId + unitId — since this is portfolio-wide, show a select for tenant in the form, then derive unitId)
- **GOTCHA**: `PaymentWithDetails` type has `tenant` and `unit.property` — import from `@/types`
- Empty state: "No payments recorded yet."
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 11: CREATE `src/app/api/vendors/route.ts`

- **IMPLEMENT** GET: return all vendors for owner (`eq(vendors.ownerId, owner.id)`, order by name)
- **IMPLEMENT** POST: validate with `vendorSchema`, insert with `ownerId: owner.id`
- **IMPORTS**: `vendors` from schema; `vendorSchema` from validations
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 12: CREATE `src/app/api/vendors/[id]/route.ts`

- **IMPLEMENT** `resolveVendor` helper — direct ownership: `and(eq(vendors.id, vendorId), eq(vendors.ownerId, owner.id))`
- **IMPLEMENT** PUT: validate `vendorSchema`, update all fields + `rating: body.rating ?? null`, `isPreferred: body.isPreferred ?? false`
- **IMPLEMENT** DELETE
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 13: CREATE `src/app/api/maintenance/route.ts`

- **IMPLEMENT** GET handler:
  - Get owner's unit IDs: query properties → units chain:
    ```ts
    const ownerProperties = await db.query.properties.findMany({
      where: eq(properties.ownerId, owner.id),
      with: { units: { columns: { id: true } } },
    });
    const unitIds = ownerProperties.flatMap(p => p.units.map(u => u.id));
    ```
  - If empty → `{ requests: [] }`
  - Query `maintenanceRequests` with `inArray(maintenanceRequests.unitId, unitIds)` + `with: { unit: { with: { property: true } }, tenant: true, vendor: true }` + order by createdAt desc
  - Return `{ requests }`
- **IMPLEMENT** POST:
  - Require `unitId` in body
  - Verify unit ownership: `db.query.units.findFirst({ where: eq(units.id, body.unitId), with: { property: true } })` → check `unit.property.ownerId !== owner.id`
  - Validate with `maintenanceRequestSchema`
  - Insert with `status: "received"`, `tenantId: body.tenantId ?? null`, `vendorId: null`
  - Return `{ request }` 201
- **IMPORTS**: `inArray, and, eq` from drizzle-orm; `maintenanceRequests, properties, units` from schema; `maintenanceRequestSchema`
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 14: CREATE `src/app/api/maintenance/[id]/route.ts`

- **IMPLEMENT** `resolveMaintenance(request, requestId)` helper:
  - Fetch `maintenanceRequests.findFirst` with `with: { unit: { with: { property: true } } }`
  - Check `req.unit.property.ownerId !== owner.id` → 404
  - Returns `{ request, owner }`
- **IMPLEMENT** GET: return full request with `with: { unit: { with: { property: true } }, tenant: true, vendor: true }`
- **IMPLEMENT** PUT (combined update + status):
  - Accept body with `maintenanceRequestSchema` fields + optional `maintenanceStatusSchema` fields (`status`, `scheduledDate`, `vendorId`, `cost`)
  - Validate base fields with `maintenanceRequestSchema`
  - Update all mutable fields including `status`, `scheduledDate`, `vendorId`, `cost`, `resolvedAt` (set to `new Date()` if status = "resolved", else null)
- **IMPLEMENT** DELETE
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 15: CREATE `src/components/maintenance/urgency-badge.tsx`

- Props: `{ urgency: MaintenanceUrgency }`
- Variant map: `Emergency: "destructive"`, `Urgent: "outline"` (use orange-ish), `Routine: "secondary"`
- **IMPORTS**: `Badge`; `MaintenanceUrgency` from `@/types`
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 16: CREATE `src/components/maintenance/status-badge.tsx`

- Props: `{ status: MaintenanceStatus }`
- Labels: `received: "Received"`, `assigned: "Assigned"`, `in_progress: "In Progress"`, `scheduled: "Scheduled"`, `resolved: "Resolved"`
- Variants: resolved → "default", all others → "secondary"
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 17: CREATE `src/components/maintenance/maintenance-form.tsx`

- Props: `{ open, onOpenChange, unitId, tenantId?: string, request?: MaintenanceRequest, onSuccess }`
- Fields:
  - `category` — Select with `MaintenanceCategory` values (Plumbing, Electrical, HVAC, Appliance, Structural, Pest, Other)
  - `urgency` — Select with Emergency / Urgent / Routine
  - `description` — textarea (`<Input as="textarea">` or just a `<textarea>` with className matching Input style)
  - `budget` — number input (optional)
  - When editing: `status` — Select with all `MaintenanceStatus` values; `scheduledDate` date input; `cost` number input; `vendorId` — text input (simple UUID for now; vendors select optional enhancement)
- POST to `/api/maintenance`, PUT to `/api/maintenance/${request.id}`
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 18: CREATE `src/components/maintenance/maintenance-list.tsx`

- Props: `{ unitId: string; tenantId?: string; requests: MaintenanceRequestWithDetails[]; onMutate: () => void }`
- Mirrors VehicleList pattern
- Each row: urgency badge, category, description (truncated to 80 chars), status badge, created date, Edit + Delete buttons
- If `resolved`, show resolved date
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 19: CREATE `src/components/vendors/vendor-form.tsx`

- Props: `{ open, onOpenChange, vendor?: Vendor, onSuccess }`
- Fields: name (required), trade (Select from VendorTrade values), phone, email, typicalRate, notes, isPreferred (checkbox), rating (1-5 number)
- POST to `/api/vendors`, PUT to `/api/vendors/${vendor.id}`
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 20: CREATE `src/app/(dashboard)/maintenance/page.tsx` (server shell)

- Renders `<MaintenanceClient />`

---

### Task 21: CREATE `src/app/(dashboard)/maintenance/maintenance-client.tsx`

- Fetch `GET /api/maintenance` on mount
- Status filter: All / Open (received + assigned + in_progress + scheduled) / Resolved
- Urgency filter: All / Emergency / Urgent / Routine
- Each row: `UrgencyBadge`, category, description preview, property + unit label, tenant name, `StatusBadge`, created date, Edit button
- Add request button (requires selecting a unit — show a Select populated from `GET /api/properties`)
- Empty state per filter
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 22: CREATE `src/app/(dashboard)/maintenance/vendors/page.tsx` (server shell)

- Renders `<VendorsClient />`

---

### Task 23: CREATE `src/app/(dashboard)/maintenance/vendors/vendors-client.tsx`

- Fetch `GET /api/vendors` on mount
- List vendors: name, trade badge, phone, email, rating (★ display), isPreferred badge
- Add / Edit / Delete actions
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 24: UPDATE `src/app/(dashboard)/layout.tsx`

- **UPDATE** `NAV_LINKS` to add Payments and Maintenance:
  ```ts
  const NAV_LINKS = [
    { href: "/dashboard", label: "Overview" },
    { href: "/properties", label: "Properties" },
    { href: "/tenants", label: "Tenants" },
    { href: "/payments", label: "Payments" },
    { href: "/maintenance", label: "Maintenance" },
  ];
  ```
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 25: UPDATE `src/app/(dashboard)/dashboard/page.tsx`

- **ADD** two new stats to the dashboard grid:
  - "Overdue" — count of payments with `status = "late"` or `status = "pending"` where `dueDate < today`
  - "Open Issues" — count of maintenanceRequests with status != "resolved"
- Query overdue: needs same `inArray(payments.tenantId, tenantIds)` pattern + filter in JS
- Query open issues: needs same `inArray(maintenanceRequests.unitId, unitIds)` + filter `status !== "resolved"`
- Update stat grid to 3 columns on sm or keep 4 cols (add a row)
- **GOTCHA**: `dueDate` is a `date` string column — compare as string: `payment.dueDate < today` where `today = new Date().toISOString().split("T")[0]`
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`

---

### Task 26: ADD unit tests for new validation schemas

- **UPDATE** `src/lib/__tests__/validations.test.ts`
- Add `describe("paymentSchema")` — test valid payment, reject negative amount, reject invalid method, reject invalid date
- Add `describe("paymentStatusSchema")` — test all valid statuses, reject invalid status
- Add `describe("vendorSchema")` — test valid vendor, reject missing name, reject invalid trade
- **PATTERN**: mirror existing `describe("maintenanceRequestSchema")` block (lines ~95–130 in validations.test.ts)
- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npm run test:run`

---

### Task 27: Final lint and type check

- **VALIDATE**: `source ~/.nvm/nvm.sh && nvm use 20 && npm run lint:fix && npx tsc --noEmit && npm run test:run`

---

## TESTING STRATEGY

### Unit Tests

Add to `src/lib/__tests__/validations.test.ts` — test `paymentSchema`, `paymentStatusSchema`, `vendorSchema` with valid/invalid inputs. Existing `maintenanceRequestSchema` tests already pass.

### Integration Tests (manual — no test server)

Use curl with a valid session cookie to verify:
- POST /api/payments creates a record
- PUT /api/payments/:id marks as paid
- DELETE /api/payments/:id removes it
- POST /api/maintenance creates request with received status
- PUT /api/maintenance/:id advances status to resolved
- All endpoints return 401 without auth

### Edge Cases

- `inArray` with empty tenant/unit list — must guard and return `[]` early (not pass empty array to `inArray` which is a SQL error)
- Payment `amount` / `lateFeeAmount` are numeric strings from Drizzle — always `Number()` before display, `.toString()` before insert
- Maintenance `resolvedAt` — set to `new Date()` only when status transitions to "resolved", else null
- Payments form on the portfolio page needs tenantId + unitId — handle case where tenant has no unit assigned (disable add or show message)

---

## VALIDATION COMMANDS

### Level 1: Type Check
```bash
source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit
```

### Level 2: Lint
```bash
source ~/.nvm/nvm.sh && nvm use 20 && npm run lint:fix
```

### Level 3: Unit Tests
```bash
source ~/.nvm/nvm.sh && nvm use 20 && npm run test:run
```

### Level 4: API Security Sweep (unauthenticated)
```bash
for path in "/api/payments" "/api/payments/x" "/api/maintenance" "/api/maintenance/x" "/api/vendors" "/api/vendors/x"; do
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$path)
  echo "$path → $code"  # all should be 401
done
```

### Level 5: Manual UI
1. Navigate to `/payments` — empty state shows
2. Open tenant detail → Payments section visible (if tenant has unit)
3. Add a payment → appears in list with "Due" badge
4. Edit payment → mark as paid → badge updates to "Paid"
5. Navigate to `/maintenance` — empty state shows
6. Add a maintenance request → appears with urgency + status badges
7. Edit maintenance request → advance to resolved → badge updates
8. Navigate to `/maintenance/vendors` — add a vendor → appears in list
9. Dashboard shows updated Overdue and Open Issues counts

---

## ACCEPTANCE CRITERIA

- [ ] GET/POST `/api/payments` return correct data with ownership enforcement
- [ ] PUT/DELETE `/api/payments/[id]` enforce ownership and update all fields
- [ ] GET/POST/PUT/DELETE `/api/maintenance` and `/api/maintenance/[id]` work end-to-end
- [ ] GET/POST/PUT/DELETE `/api/vendors` and `/api/vendors/[id]` work end-to-end
- [ ] Tenant detail page shows Payments panel (only when tenant has unit)
- [ ] `/payments` page lists all payments with status filter
- [ ] `/maintenance` page lists all requests with status + urgency filter
- [ ] `/maintenance/vendors` page lists vendors with CRUD
- [ ] Nav has Payments + Maintenance links with active state
- [ ] Dashboard shows Overdue payment count + Open Issues count
- [ ] All unauthenticated API calls return 401
- [ ] `inArray` empty-array guard in place (no SQL error on new accounts)
- [ ] Numeric columns converted correctly (no NaN display)
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npm run test:run` 50+ tests pass (new schemas covered)
- [ ] `npm run lint:fix` exits clean

---

## COMPLETION CHECKLIST

- [ ] Tasks 1–27 completed in order
- [ ] TypeScript passes after each task
- [ ] Lint clean at end
- [ ] Tests pass (50+ including new payment/vendor coverage)
- [ ] Manual walkthrough confirms add/edit/delete flow for payments and maintenance

---

## NOTES

**Why not use `/api/tenants/[id]/payments` sub-route?** The tenant detail already includes `payments` via the GET `/api/tenants/[id]` endpoint (Task 2). A sub-route adds no value; mutations go directly to `/api/payments` with `tenantId` in the body.

**Why split portfolio-level GET from per-tenant mutations?** GET `/api/payments` is for the list page (cross-tenant). POST/PUT/DELETE hit `/api/payments` and `/api/payments/[id]` directly with tenantId in body. This avoids a confusing 3-level route while keeping ownership checks straightforward.

**Vendors at `/maintenance/vendors` vs `/vendors`**: Nested under maintenance since vendors are primarily used for maintenance request assignment. Can be promoted to top-level nav in a later phase.

**No Stripe in this phase**: `stripePaymentId` column exists for future use. Payment method is manual-only (cash/check/zelle/venmo etc). Stripe integration is Phase 6+.

**Confidence Score: 9/10** — All validation schemas, DB schema, types, and patterns are already in place. Main risk is the `inArray` empty-array guard being missed and the `resolvedAt` transition logic in the maintenance PUT handler.
