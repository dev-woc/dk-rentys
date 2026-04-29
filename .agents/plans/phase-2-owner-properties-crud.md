# Feature: Owner Account + Properties & Units CRUD

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files etc.

---

## Feature Description

Build the first working slice of Groundwork: an owner can sign up, land on their dashboard with real portfolio stats, add properties (with units), view a property list, and drill into a property detail. This makes the app actually usable for the first time.

## User Story

As an owner,
I want to add my properties, see how many units I have, and drill into any property,
So that I have a single place that knows my portfolio exists.

## Problem Statement

The app has auth, schema, and a placeholder dashboard but nothing persists or displays real data. An owner who signs up lands on a "coming soon" page with nowhere to go.

## Solution Statement

Build the owner helper (lazy create on first request), full Properties + Units REST API, and three UI pages: dashboard (portfolio snapshot), properties list (all properties), and property detail (units). Add nav links for the core sections.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: API layer, dashboard UI, properties UI, nav
**Dependencies**: All installed — Drizzle ORM, Zod, shadcn/ui (need `select` and `badge` components added)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `src/lib/db/schema.ts` — `owners`, `properties`, `units` table definitions + relations
- `src/types/index.ts` — `Owner`, `Property`, `Unit`, `PropertyWithUnits`, `UnitWithTenant` types
- `src/lib/validations.ts` — `propertySchema`, `unitSchema`, `ownerSchema`
- `src/lib/rate-limit.ts` — `apiRateLimiter` export, pattern for all API routes
- `src/lib/auth/server.ts` — `auth` export, `auth.getSession()` pattern
- `src/app/(dashboard)/layout.tsx` — dashboard nav shell to extend with links
- `src/app/(dashboard)/dashboard/page.tsx` — placeholder to replace with real data

### New Files to Create

**Utilities:**
- `src/lib/owner.ts` — `getOrCreateOwner(userId, email, name)` helper used by all API routes

**API Routes:**
- `src/app/api/owner/route.ts` — GET (get/create owner), PUT (update owner profile)
- `src/app/api/properties/route.ts` — GET (list all), POST (create)
- `src/app/api/properties/[id]/route.ts` — GET (detail with units), PUT (update), DELETE
- `src/app/api/properties/[id]/units/route.ts` — GET (list), POST (add unit)
- `src/app/api/properties/[id]/units/[unitId]/route.ts` — PUT (update unit), DELETE

**Components:**
- `src/components/dashboard/stat-card.tsx` — Reusable metric card (number + label + optional icon)
- `src/components/properties/property-card.tsx` — Property summary card for list view
- `src/components/properties/property-form.tsx` — Add/edit property dialog form (client)
- `src/components/properties/unit-form.tsx` — Add/edit unit dialog form (client)
- `src/components/properties/unit-list.tsx` — Units table for property detail (client)

**Pages:**
- `src/app/(dashboard)/properties/page.tsx` — Properties list (server component, fetches via API)
- `src/app/(dashboard)/properties/[id]/page.tsx` — Property detail (server component)

**Updated Files:**
- `src/app/(dashboard)/dashboard/page.tsx` — Replace placeholder with real portfolio stats
- `src/app/(dashboard)/layout.tsx` — Add nav links for Properties, Tenants, Maintenance, Expenses

### Relevant Documentation

- [Drizzle ORM Relations Query](https://orm.drizzle.team/docs/rqb) — `db.query.properties.findMany({ with: { units: true } })` pattern
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes) — `params: Promise<{ id: string }>` in route handlers (Next.js 15)

### Patterns to Follow

**Auth + rate limit guard (mirror from Phase 1):**
```ts
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { apiRateLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = apiRateLimiter.check(ip);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { data } = await auth.getSession();
  if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
  // ... query scoped to owner.id
}
```

**Dynamic route params (Next.js 15 — params is a Promise):**
```ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // ...
}
```

**Drizzle query with relations:**
```ts
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties, units } from "@/lib/db/schema";

// list with units
const rows = await db.query.properties.findMany({
  where: eq(properties.ownerId, owner.id),
  with: { units: true },
  orderBy: (p, { asc }) => [asc(p.address)],
});

// single with ownership check
const property = await db.query.properties.findFirst({
  where: and(eq(properties.id, id), eq(properties.ownerId, owner.id)),
  with: { units: true },
});
```

**Ownership check before mutate (never skip this):**
```ts
const existing = await db.query.properties.findFirst({
  where: and(eq(properties.id, id), eq(properties.ownerId, owner.id)),
});
if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
```

**Server component data fetching (dashboard/properties pages):**
```tsx
// Server component — fetch directly from DB, not via fetch()
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { owners } from "@/lib/db/schema";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic"; // required for auth.getSession() in server components

export default async function PropertiesPage() {
  const { data } = await auth.getSession();
  if (!data?.user) redirect("/login");

  const owner = await db.query.owners.findFirst({ where: eq(owners.userId, data.user.id) });
  if (!owner) redirect("/dashboard"); // owner not set up yet

  const properties = await db.query.properties.findMany({
    where: eq(properties.ownerId, owner.id),
    with: { units: true },
    orderBy: (p, { asc }) => [asc(p.address)],
  });

  return <PropertiesClient initialProperties={properties} />;
}
```

**Client form pattern (add/edit with dialog):**
```tsx
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PropertyForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  // form state + fetch to API
}
```

**Numeric field handling:** `monthlyRent` and `mortgagePayment` come back from DB as strings (Drizzle returns `numeric` as string). Parse with `Number(value)` at the display layer only. Send as numbers in API requests.

**Zod coerce for form numbers:** Form inputs give strings. Use `z.coerce.number()` when parsing form data client-side before sending.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation (Helper + shadcn Components)
Install missing shadcn components, create the `getOrCreateOwner` helper.

### Phase 2: API Routes (Owner + Properties + Units)
Build all REST endpoints with auth guards and ownership checks.

### Phase 3: Dashboard Page (Real Data)
Replace placeholder with portfolio stats pulled directly from DB in a server component.

### Phase 4: Properties List Page + Components
Properties list with add dialog. Full CRUD loop in the UI.

### Phase 5: Property Detail Page
Drill-down view with unit list, add/edit/delete units.

### Phase 6: Nav + Polish
Add nav links, update dashboard layout for full navigation.

---

## STEP-BY-STEP TASKS

---

### Task 1: INSTALL Missing shadcn/ui Components

```bash
npx shadcn@latest add select badge --yes 2>/dev/null || npx shadcn@latest add select badge
```

- **VALIDATE**: `ls src/components/ui/select.tsx src/components/ui/badge.tsx` — both exist

---

### Task 2: CREATE `src/lib/owner.ts`

Single helper that every API route uses to get or lazily create the owner record.

```ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { owners } from "@/lib/db/schema";
import type { Owner } from "@/types";

export async function getOrCreateOwner(
  userId: string,
  email: string,
  name: string,
): Promise<Owner> {
  const existing = await db.query.owners.findFirst({
    where: eq(owners.userId, userId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(owners)
    .values({ userId, email, name })
    .returning();

  return created;
}
```

- **IMPORTS**: `eq` from `"drizzle-orm"`, `db` from `"@/lib/db"`, `owners` from `"@/lib/db/schema"`, `Owner` from `"@/types"`
- **VALIDATE**: `node_modules/.bin/tsc --noEmit` — no errors

---

### Task 3: CREATE `src/app/api/owner/route.ts`

GET — get (or create) owner record for the authenticated user.
PUT — update owner profile fields (name, phone).

```ts
// GET: return owner (creates if first visit)
// PUT: validate with ownerSchema, update name + phone + updatedAt
```

Pattern mirrors Phase 1 API routes exactly. Import `getOrCreateOwner` from `@/lib/owner`.

- **IMPORTS**: `auth` from `@/lib/auth/server`, `apiRateLimiter` from `@/lib/rate-limit`, `getOrCreateOwner` from `@/lib/owner`, `ownerSchema` from `@/lib/validations`, `db`, `owners`, `eq`
- **VALIDATE**: TypeScript clean, route file exists at correct path

---

### Task 4: CREATE `src/app/api/properties/route.ts`

GET — list all properties for the owner (with unit count via `with: { units: true }`).
POST — create a new property; validate body with `propertySchema`.

**POST response:** Return `{ property }` with status 201.
**GET response:** Return `{ properties }` — array of properties each with `units` array.

```ts
// POST insert pattern:
const [property] = await db
  .insert(properties)
  .values({
    ownerId: owner.id,
    address: result.data.address,
    city: result.data.city,
    state: result.data.state,
    zip: result.data.zip,
    propertyType: result.data.propertyType,
    purchaseDate: result.data.purchaseDate ?? null,
    mortgagePayment: result.data.mortgagePayment?.toString() ?? null,
    notes: result.data.notes,
  })
  .returning();
```

- **GOTCHA**: `mortgagePayment` must be passed as a string to Drizzle (`numeric` columns take string values for insertion)
- **GOTCHA**: `purchaseDate` is `date` type — pass as `"YYYY-MM-DD"` string or null
- **VALIDATE**: Route file exists, TypeScript clean

---

### Task 5: CREATE `src/app/api/properties/[id]/route.ts`

GET — single property with units. Ownership check: `and(eq(properties.id, id), eq(properties.ownerId, owner.id))`.
PUT — validate with `propertySchema`, update fields + `updatedAt`.
DELETE — ownership check, then delete (cascades to units via FK).

**GET response:** Return `{ property }` where property includes `units` array.
**DELETE response:** Return `{ success: true }`.

- **GOTCHA**: `params` is `Promise<{ id: string }>` in Next.js 15 — must `await params`
- **VALIDATE**: TypeScript clean

---

### Task 6: CREATE `src/app/api/properties/[id]/units/route.ts`

GET — list units for a property (verify property ownership first).
POST — create a unit under a property; validate with `unitSchema`.

```ts
// Ownership check before inserting unit:
const property = await db.query.properties.findFirst({
  where: and(eq(properties.id, propertyId), eq(properties.ownerId, owner.id)),
});
if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

// Then insert unit:
const [unit] = await db.insert(units).values({
  propertyId: property.id,
  unitNumber: result.data.unitNumber,
  bedrooms: result.data.bedrooms,
  bathrooms: result.data.bathrooms,
  sqft: result.data.sqft ?? null,
}).returning();
```

- **VALIDATE**: TypeScript clean

---

### Task 7: CREATE `src/app/api/properties/[id]/units/[unitId]/route.ts`

PUT — validate with `unitSchema`, update unit fields. Must verify the unit belongs to a property owned by this owner (two-level ownership check).
DELETE — delete unit. Same ownership check.

```ts
// Two-level ownership check:
const unit = await db.query.units.findFirst({
  where: eq(units.id, unitId),
  with: { property: true },
});
if (!unit || unit.property.ownerId !== owner.id) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

- **GOTCHA**: params has BOTH `id` (propertyId) and `unitId` — destructure both from `await params`
- **VALIDATE**: TypeScript clean

---

### Task 8: CREATE `src/components/dashboard/stat-card.tsx`

Simple card showing a number, label, and optional subtitle. Used on the dashboard for portfolio stats.

```tsx
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export function StatCard({ label, value, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm font-medium mt-1">{label}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}
```

- **IMPORTS**: `Card`, `CardContent` from `@/components/ui/card`
- **VALIDATE**: TypeScript clean

---

### Task 9: REPLACE `src/app/(dashboard)/dashboard/page.tsx`

Server component. Query real portfolio stats directly from DB.

Stats to show:
- Total properties
- Total units
- Occupied units (tenants with `move_out_date IS NULL` and `unit_id IS NOT NULL`)
- Vacant units (total units - occupied)

```tsx
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { data } = await auth.getSession();
  if (!data?.user) redirect("/login");

  const owner = await db.query.owners.findFirst({
    where: eq(owners.userId, data.user.id),
  });

  // If owner record doesn't exist yet (first login), create it lazily
  // then show empty state
  const allProperties = owner
    ? await db.query.properties.findMany({
        where: eq(properties.ownerId, owner.id),
        with: { units: { with: { tenants: true } } },
      })
    : [];

  const totalUnits = allProperties.flatMap((p) => p.units);
  const occupiedUnits = totalUnits.filter((u) =>
    u.tenants.some((t) => !t.moveOutDate),
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Portfolio Overview</h1>
        <p className="text-muted-foreground">
          {owner
            ? `Welcome back, ${owner.name || data.user.name || "there"}`
            : "Welcome to Groundwork"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <StatCard label="Properties" value={allProperties.length} />
        <StatCard label="Total Units" value={totalUnits.length} />
        <StatCard label="Occupied" value={occupiedUnits.length} />
        <StatCard
          label="Vacant"
          value={totalUnits.length - occupiedUnits.length}
        />
      </div>

      {allProperties.length === 0 && (
        <div className="text-center py-16 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground mb-4">No properties yet.</p>
          <Link href="/properties">
            <Button>Add Your First Property</Button>
          </Link>
        </div>
      )}

      {allProperties.length > 0 && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Properties</h2>
          <Link href="/properties">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>
        // Show first 5 property cards
      )}
    </div>
  );
}
```

- **IMPORTS**: `auth` from `@/lib/auth/server`, `db` from `@/lib/db`, `owners`, `properties` from `@/lib/db/schema`, `eq` from `drizzle-orm`, `redirect` from `next/navigation`, `Link` from `next/link`, `StatCard` from `@/components/dashboard/stat-card`, `Button` from `@/components/ui/button`
- **GOTCHA**: `export const dynamic = "force-dynamic"` is required on any server component calling `auth.getSession()`
- **NOTE**: The dashboard queries `units.tenants` to compute occupancy. This is a 3-level deep query: properties → units → tenants. Drizzle RQB handles this with nested `with`.

---

### Task 10: CREATE `src/components/properties/property-card.tsx`

Card displayed in the properties list. Shows address, city/state, property type badge, unit count, and a link to the detail page.

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Property, Unit } from "@/types";

interface PropertyCardProps {
  property: Property & { units: Unit[] };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const occupied = property.units.filter(/* has active tenant — pass from parent */);
  return (
    <Link href={`/properties/${property.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{property.address}</p>
              <p className="text-sm text-muted-foreground">
                {property.city}, {property.state} {property.zip}
              </p>
            </div>
            <Badge variant="secondary">{formatPropertyType(property.propertyType)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {property.units.length} {property.units.length === 1 ? "unit" : "units"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatPropertyType(type: string): string {
  return { single_family: "Single Family", multi_unit: "Multi-Unit", condo: "Condo", townhouse: "Townhouse" }[type] ?? type;
}
```

- **IMPORTS**: `Badge` from `@/components/ui/badge`, `Card`, `CardContent`, `CardHeader` from `@/components/ui/card`, `Property`, `Unit` from `@/types`

---

### Task 11: CREATE `src/components/properties/property-form.tsx`

Client component. Dialog with form fields for add/edit property.

**Fields:** address, city, state (text, 2-char), zip, propertyType (Select), purchaseDate (optional), mortgagePayment (optional number), notes (textarea).

On submit: POST to `/api/properties` (create) or PUT to `/api/properties/[id]` (edit). Call `onSuccess()` on 2xx response to trigger parent refresh.

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Property } from "@/types";

interface PropertyFormProps {
  property?: Property;  // if provided, edit mode; otherwise create mode
  onSuccess: (property: Property) => void;
  trigger: React.ReactNode;
}
```

- **GOTCHA**: `Select` from shadcn is a controlled component — manage value with `useState` and pass to `onValueChange`
- **GOTCHA**: `mortgagePayment` from DB is a string (numeric type). Display with `Number()` in edit mode.

---

### Task 12: CREATE `src/components/properties/unit-form.tsx`

Client component. Dialog for add/edit unit.

**Fields:** unitNumber (text, optional), bedrooms (number input), bathrooms (number input), sqft (number input, optional).

On submit: POST to `/api/properties/[propertyId]/units` (create) or PUT to `/api/properties/[propertyId]/units/[unitId]` (edit). Call `onSuccess(unit)`.

---

### Task 13: CREATE `src/components/properties/unit-list.tsx`

Client component. Renders a table/list of units for a property. Each row shows: unit number (or "Main Unit"), bedrooms, bathrooms, sqft, and Edit/Delete actions.

Delete calls `DELETE /api/properties/[propertyId]/units/[unitId]` with confirmation.

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UnitForm } from "./unit-form";
import type { Unit } from "@/types";

interface UnitListProps {
  propertyId: string;
  initialUnits: Unit[];
}
```

---

### Task 14: CREATE `src/app/(dashboard)/properties/page.tsx`

Server component. Lists all owner properties. Passes `initialProperties` to a thin client wrapper that can optimistically add new properties after the form submits.

```tsx
export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  // 1. auth.getSession()
  // 2. find or create owner
  // 3. db.query.properties.findMany({ where: eq(properties.ownerId, owner.id), with: { units: true } })
  // 4. render PropertiesClient with initialProperties
}
```

Create a companion `src/app/(dashboard)/properties/properties-client.tsx` (client component) that:
- Holds `properties` in local state (initialized from server prop)
- Renders `PropertyForm` trigger button + `PropertyCard` grid
- `onSuccess` handler adds new property to local state (optimistic — no re-fetch needed)

---

### Task 15: CREATE `src/app/(dashboard)/properties/[id]/page.tsx`

Server component. Shows property detail with unit list.

```tsx
export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // auth check, owner check, property ownership check
  // query property with units
  // render: breadcrumb, property header, edit button, UnitList + add unit button
}
```

Layout:
- Back link to `/properties`
- Property address as heading, city/state, type badge
- Edit property button (opens `PropertyForm` in edit mode)
- "Units" section heading + "Add Unit" button
- `UnitList` component with current units

---

### Task 16: UPDATE `src/app/(dashboard)/layout.tsx`

Add nav links for the main sections. Keep the existing sign-out button.

Nav links to add: Dashboard, Properties, Tenants (disabled/coming soon), Maintenance (disabled/coming soon).

```tsx
// Nav links array
const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
];
```

Use `usePathname()` to highlight the active link with a different variant.

- **IMPORTS**: `usePathname` from `"next/navigation"`, `Link` from `"next/link"`
- **PATTERN**: `variant={pathname.startsWith(href) ? "default" : "ghost"}` on Button

---

## TESTING STRATEGY

No new pure-function utilities are being added that aren't already covered. API route logic is validated via:
1. TypeScript (`tsc --noEmit`) — catches all import/type errors
2. Biome lint — catches style issues
3. Build check — catches runtime import errors

Unit tests for the owner helper aren't practical without a real DB. Integration coverage comes from the E2E tests (future phase).

---

## VALIDATION COMMANDS

```bash
node_modules/.bin/tsc --noEmit   # Zero type errors
npm run lint                      # Zero Biome errors
npm run test:run                  # 50 existing tests still pass
npm run build                     # (limited by Node 18.17 vs 18.18 requirement)
```

---

## ACCEPTANCE CRITERIA

- [ ] `getOrCreateOwner` helper creates owner row on first call, returns existing on subsequent calls
- [ ] `GET /api/owner` returns or creates owner record
- [ ] `PUT /api/owner` updates name and phone
- [ ] `GET /api/properties` returns all properties with units for authenticated owner
- [ ] `POST /api/properties` creates property, validates with propertySchema
- [ ] `GET /api/properties/[id]` returns property + units (404 if not owned)
- [ ] `PUT /api/properties/[id]` updates property fields (404 if not owned)
- [ ] `DELETE /api/properties/[id]` deletes property + cascades units (404 if not owned)
- [ ] `POST /api/properties/[id]/units` adds unit to property (ownership check)
- [ ] `PUT /api/properties/[id]/units/[unitId]` updates unit (two-level ownership check)
- [ ] `DELETE /api/properties/[id]/units/[unitId]` deletes unit
- [ ] Dashboard shows real: property count, unit count, occupied count, vacant count
- [ ] Empty state on dashboard links to `/properties`
- [ ] Properties list page shows all properties as cards
- [ ] Add property dialog opens, submits, card appears without page reload
- [ ] Property detail page shows property info + unit list
- [ ] Add unit dialog opens on detail page, unit appears without reload
- [ ] Edit property and edit unit dialogs pre-populate with current values
- [ ] Delete unit works with confirmation
- [ ] Nav links highlight active section
- [ ] `tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run test:run` — 50 existing tests still pass

---

## COMPLETION CHECKLIST

- [ ] Tasks 1–2: Foundation (shadcn + owner helper)
- [ ] Tasks 3–7: All API routes
- [ ] Task 8: StatCard component
- [ ] Task 9: Dashboard page (real data)
- [ ] Tasks 10–13: Property/Unit components
- [ ] Tasks 14–15: Properties list + detail pages
- [ ] Task 16: Nav updated
- [ ] Validation sweep passes

---

## NOTES

**Why server components for pages:** Next.js App Router server components can query the DB directly without an extra round-trip through the API. This is faster and simpler for pages that just read data. Mutations (add/edit/delete) still go through the API routes so the client can handle optimistic updates.

**Optimistic UI pattern:** After a successful POST, add the returned property to local React state rather than re-fetching. Keeps the UX snappy. On hard refresh, the server re-fetches. No SWR or React Query needed at this scale.

**`mortgagePayment` as string:** Drizzle returns `numeric` columns as strings. Never parse to float for storage. Pass to Intl.NumberFormat or `Number()` only when displaying to the user.

**Confidence Score: 8/10** — All patterns established. Risk areas: Drizzle deep `with` queries (3 levels) and the shadcn Select controlled component pattern. Both are standard usage with good docs.
