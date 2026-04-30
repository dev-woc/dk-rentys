# Feature: Phase 3 — Tenants & Leases

The following plan should be complete, but validate documentation and codebase patterns before implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Add the tenant and lease layer on top of the existing properties/units foundation. This completes the core landlord data-entry workflow: Add Property → Add Units → Add Tenants → Add Lease. Once tenants and leases exist, the dashboard occupancy stats become meaningful, and all future modules (payments, maintenance) have the tenant context they need.

## User Story

As a landlord,
I want to add tenants to units and track their leases,
So that I know who lives in each unit, when their lease expires, and can see real occupancy across my portfolio.

## Problem Statement

Properties and units exist in the system but there's no way to add tenants or leases through the UI. The dashboard shows occupancy as 0 because no tenants exist. The unit list on the property detail page shows units but no occupant info.

## Solution Statement

Build full tenant CRUD (profile, emergency contacts, vehicle records, notes) and lease CRUD (dates, rent, deposit, status), wired together so units display their current tenant and lease status. Enhance the dashboard with a "Leases Expiring Soon" panel. Add a Tenants section to the nav.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: Tenants, Vehicles, Leases, Dashboard, Unit list
**Dependencies**: Existing properties/units CRUD (Phase 2 — complete)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — MUST READ BEFORE IMPLEMENTING

- `src/lib/db/schema.ts` — tenants, vehicles, leases table definitions + relations
- `src/lib/validations.ts` — tenantSchema, vehicleSchema, leaseSchema (all exist, use them)
- `src/types/index.ts` — Tenant, Vehicle, Lease types + UnitWithTenants, PropertyWithUnits composites
- `src/lib/owner.ts` — getOrCreateOwner() helper, used in every API route
- `src/lib/rate-limit.ts` — apiRateLimiter.check(ip) pattern
- `src/app/api/properties/[id]/units/[unitId]/route.ts` — two-level ownership check pattern (unit → property → owner)
- `src/app/api/properties/[id]/route.ts` — resolveOwner() helper pattern
- `src/app/api/properties/route.ts` — GET list + POST create pattern
- `src/components/properties/property-form.tsx` — dialog form pattern with fetch + error state
- `src/components/properties/unit-list.tsx` — list with inline edit/delete pattern
- `src/components/properties/unit-form.tsx` — simple dialog form pattern
- `src/components/dashboard/stat-card.tsx` — StatCard component
- `src/app/(dashboard)/layout.tsx` — NAV_LINKS array, active link pattern
- `src/app/(dashboard)/properties/properties-client.tsx` — useCallback fetch + state pattern
- `src/app/(dashboard)/properties/[id]/property-detail-client.tsx` — detail page client pattern

### New Files to Create

**API routes:**
- `src/app/api/tenants/route.ts` — GET list, POST create
- `src/app/api/tenants/[id]/route.ts` — GET, PUT, DELETE
- `src/app/api/tenants/[id]/vehicles/route.ts` — GET list, POST create
- `src/app/api/tenants/[id]/vehicles/[vehicleId]/route.ts` — PUT, DELETE
- `src/app/api/leases/route.ts` — POST create (unit is in body)
- `src/app/api/leases/[id]/route.ts` — PUT, DELETE

**Components:**
- `src/components/tenants/tenant-form.tsx` — add/edit tenant dialog (name, phone, email, DOB, moveInDate, unitId select, notes)
- `src/components/tenants/tenant-card.tsx` — compact card for tenants list page
- `src/components/tenants/vehicle-form.tsx` — add/edit vehicle dialog
- `src/components/tenants/vehicle-list.tsx` — vehicle table within tenant detail
- `src/components/tenants/lease-form.tsx` — add/edit lease dialog (dates, rent, deposit, status)
- `src/components/tenants/lease-badge.tsx` — lease status badge (Active / Expiring Soon / Month-to-Month / Expired)

**Pages:**
- `src/app/(dashboard)/tenants/page.tsx` — thin server wrapper
- `src/app/(dashboard)/tenants/tenants-client.tsx` — tenants list with search
- `src/app/(dashboard)/tenants/[id]/page.tsx` — thin server wrapper
- `src/app/(dashboard)/tenants/[id]/tenant-detail-client.tsx` — full tenant profile

### Patterns to Follow

**API ownership check (single resource):**
```ts
// From src/app/api/properties/[id]/route.ts
async function resolveOwner(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = apiRateLimiter.check(ip);
  if (!success) return { error: "Too many requests", status: 429 } as const;
  const { data } = await auth.getSession();
  if (!data?.user) return { error: "Unauthorized", status: 401 } as const;
  const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
  return { owner } as const;
}
```

**Two-level ownership check (tenant → owner):**
```ts
// tenants have ownerId directly (denormalized) — use eq(tenants.ownerId, owner.id) directly
const tenant = await db.query.tenants.findFirst({
  where: and(eq(tenants.id, tenantId), eq(tenants.ownerId, owner.id)),
});
if (!tenant) return { error: "Not found", status: 404 };
```

**Lease ownership check (lease → unit → property → owner):**
```ts
const lease = await db.query.leases.findFirst({
  where: eq(leases.id, leaseId),
  with: { unit: { with: { property: true } } },
});
if (!lease || lease.unit.property.ownerId !== owner.id) return { error: "Not found", status: 404 };
```

**Vehicle ownership check (vehicle → tenant → owner):**
```ts
const vehicle = await db.query.vehicles.findFirst({
  where: eq(vehicles.id, vehicleId),
  with: { tenant: true },
});
if (!vehicle || vehicle.tenant.ownerId !== owner.id) return { error: "Not found", status: 404 };
```

**Client form pattern:**
```ts
// From src/components/properties/property-form.tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setError(""); setLoading(true);
  const form = e.currentTarget;
  const data = new FormData(form);
  // build body from FormData
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const json = await res.json(); setError(json.error ?? "Something went wrong"); return; }
    onSuccess(); onOpenChange(false);
  } catch { setError("Network error"); } finally { setLoading(false); }
}
```

**Lease status calculation:**
```ts
function getLeaseStatus(lease: Lease): "active" | "expiring_soon" | "month_to_month" | "expired" {
  const today = new Date();
  const end = new Date(lease.endDate);
  const daysUntilEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilEnd < 0) return "expired";
  if (daysUntilEnd <= 60) return "expiring_soon";
  if (lease.status === "month_to_month") return "month_to_month";
  return "active";
}
```

**Naming conventions:**
- Files: kebab-case (`tenant-form.tsx`, `lease-badge.tsx`)
- Components: PascalCase (`TenantForm`, `LeaseBadge`)
- API params: `tenantId`, `vehicleId`, `leaseId` — consistent with `unitId`, `propertyId`

---

## IMPLEMENTATION PLAN

### Phase A: API Layer

Build all backend routes before touching UI. Each route follows the exact same rate-limit → auth → ownership check → validate → mutate pattern.

### Phase B: Types

Update `src/types/index.ts` with composite types needed by UI components.

### Phase C: Tenant UI

Tenants list page, tenant detail page, tenant form, inline lease management.

### Phase D: Lease UI within Unit Detail

Add lease section to the property detail page's unit view. Each unit shows its current tenant + active lease.

### Phase E: Dashboard Enhancement

Add "Leases Expiring Soon" panel to the dashboard. Update Nav with Tenants link.

---

## STEP-BY-STEP TASKS

### Task 1: CREATE `src/app/api/tenants/route.ts`

- **IMPLEMENT**: GET — list all tenants for owner ordered by fullName asc. POST — create tenant with tenantSchema.
- **PATTERN**: `src/app/api/properties/route.ts` (exact same structure)
- **IMPORTS**: `eq` from drizzle-orm, `db`, `tenants`, `owners` from schema, `getOrCreateOwner`, `apiRateLimiter`, `tenantSchema`, `auth`
- **KEY**: `tenants.ownerId` is directly on the tenant row — no join needed for ownership
- **GOTCHA**: `unitId` is optional on create — tenant may not be assigned to a unit yet
- **VALIDATE**: `curl -X GET http://localhost:3000/api/tenants` → 401 (no session)

### Task 2: CREATE `src/app/api/tenants/[id]/route.ts`

- **IMPLEMENT**: GET (single tenant with vehicles + leases), PUT (update with tenantSchema), DELETE
- **PATTERN**: `src/app/api/properties/[id]/route.ts`
- **IMPORTS**: `and`, `eq`, auth, db, tenants, getOrCreateOwner, apiRateLimiter, tenantSchema
- **KEY**: Use `and(eq(tenants.id, id), eq(tenants.ownerId, owner.id))` for all operations
- **GET with**: `with: { vehicles: true, leases: true }`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 3: CREATE `src/app/api/tenants/[id]/vehicles/route.ts`

- **IMPLEMENT**: GET list vehicles for tenant, POST create vehicle with vehicleSchema
- **PATTERN**: `src/app/api/properties/[id]/units/route.ts`
- **IMPORTS**: `and`, `eq`, vehicles, tenants, vehicleSchema
- **KEY**: Verify tenant ownership before creating — `and(eq(tenants.id, tenantId), eq(tenants.ownerId, owner.id))`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 4: CREATE `src/app/api/tenants/[id]/vehicles/[vehicleId]/route.ts`

- **IMPLEMENT**: PUT (update vehicle), DELETE
- **PATTERN**: `src/app/api/properties/[id]/units/[unitId]/route.ts`
- **KEY**: Two-level check — find vehicle `with: { tenant: true }`, verify `vehicle.tenant.ownerId !== owner.id`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 5: CREATE `src/app/api/leases/route.ts`

- **IMPLEMENT**: POST create lease — body includes `unitId` and `tenantId`. Verify unit ownership via `with: { property: true }`.
- **IMPORTS**: leases, units, leaseSchema
- **KEY**: `monthlyRent` stored as `numeric` — pass as string: `result.data.monthlyRent.toString()`
- **GOTCHA**: `securityDeposit` defaults to `"0"` in schema — pass `result.data.securityDeposit.toString()`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 6: CREATE `src/app/api/leases/[id]/route.ts`

- **IMPLEMENT**: PUT (update), DELETE
- **KEY**: Three-level ownership — lease → unit → property → ownerId. Use `with: { unit: { with: { property: true } } }`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 7: UPDATE `src/types/index.ts`

- **ADD** composite types:
```ts
export interface TenantWithDetails extends Tenant {
  vehicles: Vehicle[];
  leases: Lease[];
}

export interface UnitWithOccupant extends Unit {
  tenants: Tenant[];
  leases: Lease[];
}
```
- **UPDATE** `UnitWithTenants` → used in property queries (already has `tenants: Tenant[]`)
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 8: CREATE `src/components/tenants/lease-badge.tsx`

- **IMPLEMENT**: Small badge showing lease status with color coding:
  - `active` → green (default variant)
  - `expiring_soon` → yellow/warning (use `outline` variant + yellow text or destructive)
  - `month_to_month` → blue (secondary)
  - `expired` → red (destructive)
- **PATTERN**: `src/components/ui/badge.tsx` (import Badge, use variant prop)
- **IMPLEMENT** `getLeaseStatus(lease: Lease)` utility function in same file
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 9: CREATE `src/components/tenants/lease-form.tsx`

- **IMPLEMENT**: Dialog form — add/edit lease. Fields: startDate (date input), endDate (date input), monthlyRent (number), securityDeposit (number), status (Select: active/month_to_month/expired), lateFeePolicy (text, optional).
- **PATTERN**: `src/components/properties/property-form.tsx`
- **API**: POST `/api/leases` (create, needs unitId + tenantId in body) or PUT `/api/leases/${lease.id}` (edit)
- **GOTCHA**: `monthlyRent` and `securityDeposit` come back from API as strings (numeric column) — display with `Number(lease.monthlyRent)`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 10: CREATE `src/components/tenants/vehicle-form.tsx`

- **IMPLEMENT**: Dialog form — add/edit vehicle. Fields: make, model, year (number), color, plateNumber (auto-uppercase), plateState (2-char, auto-uppercase), parkingSpot (optional), isAuthorized (checkbox).
- **PATTERN**: `src/components/properties/unit-form.tsx`
- **API**: POST `/api/tenants/${tenantId}/vehicles` or PUT `/api/tenants/${tenantId}/vehicles/${vehicleId}`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 11: CREATE `src/components/tenants/vehicle-list.tsx`

- **IMPLEMENT**: Table of vehicles with edit/delete. Each row: `{year} {color} {make} {model} · {plateState} {plateNumber}` + parking spot if set + authorized badge.
- **PATTERN**: `src/components/properties/unit-list.tsx`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 12: CREATE `src/components/tenants/tenant-form.tsx`

- **IMPLEMENT**: Dialog form — add/edit tenant. Fields:
  - fullName (required), phone, email, dateOfBirth (date, optional), moveInDate (date, optional)
  - unitId (Select — fetches `/api/properties` to build unit options grouped by property)
  - notes (textarea, optional)
  - Emergency contact section: name, relationship, phone, email
- **PATTERN**: `src/components/properties/property-form.tsx`
- **GOTCHA**: unitId select needs to load available units. On mount fetch `/api/properties` and flatten to `[{ id, label: "123 Main St — Unit 1A" }]`
- **API**: POST `/api/tenants` (create) or PUT `/api/tenants/${tenant.id}` (edit)
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 13: CREATE `src/components/tenants/tenant-card.tsx`

- **IMPLEMENT**: Compact card for tenants list. Shows: fullName, unit address (if assigned), phone, email, active lease badge (if lease exists), move-in date.
- **PATTERN**: `src/components/properties/property-card.tsx`
- **LINK**: to `/tenants/${tenant.id}`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 14: CREATE `src/app/(dashboard)/tenants/tenants-client.tsx`

- **IMPLEMENT**: Client component. Fetches `/api/tenants`. Search box filters by name, email, phone client-side. Add Tenant button opens TenantForm dialog. Grid of TenantCards.
- **PATTERN**: `src/app/(dashboard)/properties/properties-client.tsx`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 15: CREATE `src/app/(dashboard)/tenants/page.tsx`

- **IMPLEMENT**: Thin server wrapper — just renders `<TenantsClient />`
- **PATTERN**: `src/app/(dashboard)/properties/page.tsx`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 16: CREATE `src/app/(dashboard)/tenants/[id]/tenant-detail-client.tsx`

- **IMPLEMENT**: Full tenant profile page. Sections:
  1. **Header** — fullName, unit assignment badge, edit/delete buttons
  2. **Contact info** — phone, email, DOB, move-in date
  3. **Emergency contact** — name, relationship, phone, email
  4. **Notes** — if present
  5. **Active Lease** — LeaseForm + LeaseBadge. Show current lease terms (dates, rent, deposit, status). Add/edit lease buttons.
  6. **Vehicles** — VehicleList component
- **PATTERN**: `src/app/(dashboard)/properties/[id]/property-detail-client.tsx`
- **API**: GET `/api/tenants/${tenantId}` (returns tenant with vehicles + leases)
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 17: CREATE `src/app/(dashboard)/tenants/[id]/page.tsx`

- **IMPLEMENT**: Thin server wrapper — awaits params, renders `<TenantDetailClient tenantId={id} />`
- **PATTERN**: `src/app/(dashboard)/properties/[id]/page.tsx`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 18: UPDATE `src/components/properties/unit-list.tsx`

- **UPDATE**: Each unit row should show current tenant name (if assigned) and active lease status badge.
- **CHANGE**: Accept `units: UnitWithTenants[]` instead of `units: Unit[]`. Import `UnitWithTenants` from `@/types`.
- **DISPLAY**: Below the unit number/size line, show tenant name as a link to `/tenants/${tenant.id}` if a current tenant exists (moveOutDate === null). Show LeaseBadge for active lease.
- **GOTCHA**: The property detail page fetches with `with: { units: { with: { tenants: true } } }` already — just needs the type update and rendering.
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 19: UPDATE `src/app/(dashboard)/properties/[id]/property-detail-client.tsx`

- **UPDATE**: Fetch includes `units → tenants` already. Cast units as `UnitWithTenants[]` when passing to `UnitList`.
- **ADD**: A "Add Tenant to Unit" shortcut — small link next to vacant units that opens TenantForm pre-filled with that unitId.
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 20: UPDATE `src/app/(dashboard)/dashboard/page.tsx`

- **ADD**: "Leases Expiring Soon" panel — query leases where `endDate <= 60 days from today AND status = 'active'`, joined with unit + property for address display.
- **DRIZZLE QUERY**:
```ts
const today = new Date();
const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
// Use lte/gte from drizzle-orm with properties.ownerId filter via join
```
- **DISPLAY**: If 0 expiring leases → don't show panel. If > 0 → show list with unit address, tenant name, days remaining, LeaseBadge.
- **PATTERN**: Existing dashboard page query pattern
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 21: UPDATE `src/app/(dashboard)/layout.tsx`

- **ADD** Tenants to NAV_LINKS:
```ts
const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/properties", label: "Properties" },
  { href: "/tenants", label: "Tenants" },
];
```
- **VALIDATE**: `node_modules/.bin/tsc --noEmit`

### Task 22: UPDATE `src/middleware.ts`

- `/tenants/:path*` is already in the matcher — no change needed. Verify.

### Task 23: FINAL VALIDATION

- **VALIDATE**: `node_modules/.bin/tsc --noEmit` → 0 errors
- **VALIDATE**: `npm run lint` → 0 errors (run `npm run lint:fix` first)
- **VALIDATE**: `npm run test:run` → 50/50 passing

---

## TESTING STRATEGY

### Manual Flow to Validate

1. Log in → Dashboard shows 0 occupied units
2. Go to Properties → open a property → open a unit
3. Click "Add Tenant to Unit" → fill tenant form → save
4. Tenant appears on unit row with name
5. Go to Tenants → tenant appears in list
6. Open tenant → add a lease (dates, rent) → lease shows with Active badge
7. Return to Dashboard → occupied count increases
8. Edit lease end date to within 60 days → "Leases Expiring Soon" panel appears on dashboard
9. Add a vehicle to tenant → appears in vehicle list
10. Delete tenant → unit shows as vacant again

---

## VALIDATION COMMANDS

### Level 1: Type Check
```bash
node_modules/.bin/tsc --noEmit
```

### Level 2: Lint
```bash
npm run lint:fix && npm run lint
```

### Level 3: Tests
```bash
npm run test:run
```

---

## ACCEPTANCE CRITERIA

- [ ] Tenant CRUD API — all routes return correct status codes, ownership enforced
- [ ] Vehicle CRUD API — scoped to tenant, ownership enforced
- [ ] Lease CRUD API — scoped to unit+tenant, ownership enforced
- [ ] Tenant list page — loads, search works, add tenant dialog works
- [ ] Tenant detail page — full profile visible, edit/delete works
- [ ] Lease section on tenant detail — add/edit/status display works
- [ ] Vehicle list on tenant detail — add/edit/delete works
- [ ] Unit list on property detail — shows tenant name + lease badge
- [ ] Dashboard — occupancy count reflects real tenant data
- [ ] Dashboard — "Leases Expiring Soon" panel appears when relevant
- [ ] Nav — Tenants link active-highlighted correctly
- [ ] `tsc --noEmit` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test:run` → 50/50 passing

---

## NOTES

- `numeric` columns (`monthlyRent`, `securityDeposit`) come back from Drizzle as strings — always wrap in `Number()` for display and `.toString()` when inserting.
- `tenants.ownerId` is denormalized — ownership checks are a single `eq` condition, no join needed. This was an explicit design decision to avoid 3-join ownership checks on every API call.
- Lease status is computed at read time from `endDate` + `status` column, not stored separately (except for `month_to_month` which is explicit). The `getLeaseStatus()` helper should live in `lease-badge.tsx` and be exported for reuse.
- The TenantForm needs to load all properties+units to populate the unit select. This is an extra fetch on form open — acceptable for now (owners have <20 properties).
- `moveOutDate === null` is how we determine a tenant is "current" — this is consistent with the dashboard occupancy query in Phase 2.
