# Feature: Groundwork Database Schema — Replace Link-in-Bio with Property Management Data Model

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files etc.

---

## Feature Description

Replace the entire link-in-bio data layer with the Groundwork property management schema. This means dropping the three old tables (`profiles`, `link_items`, `click_events`), introducing eleven new tables that model a full property management domain, updating all TypeScript types, replacing all Zod validation schemas, removing link-in-bio API routes and UI components that are now dead code, and updating middleware to protect the new route structure.

This is the foundational step — no feature work can begin until the schema is correct.

## User Story

As a developer building Groundwork,
I want the database schema to accurately model property management entities (owners, properties, units, tenants, leases, payments, maintenance, vendors, expenses, messages),
So that all future features have the correct data foundation and relationships to build on.

## Problem Statement

The current codebase has a link-in-bio schema (`profiles`, `link_items`, `click_events`) that is completely wrong for a property management application. Every future feature — dashboard, rent collection, maintenance requests — will reference these tables. Shipping the wrong schema now will require a painful migration later.

## Solution Statement

Full replacement of `src/lib/db/schema.ts` with 11 Drizzle/Postgres tables mapped to the Groundwork PRD data model. Remove all link-in-bio API routes, components, hooks, and migration artifacts. Update types, validations, middleware, and env config to match the new domain.

## Feature Metadata

**Feature Type**: Refactor (foundational data layer replacement)
**Estimated Complexity**: High
**Primary Systems Affected**: Database schema, TypeScript types, Zod validations, API routes, middleware, components
**Dependencies**: Drizzle ORM, Neon Postgres, Zod (all already installed)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `src/lib/db/schema.ts` — Current link-in-bio schema to be fully replaced
- `src/lib/db/index.ts` — Drizzle client setup; keep as-is (pattern is correct)
- `drizzle.config.ts` — Keep as-is
- `src/types/index.ts` — Fully replace with Drizzle-inferred Groundwork types
- `src/lib/validations.ts` — Fully replace with Groundwork Zod schemas
- `src/middleware.ts` — Update protected route matcher only
- `src/lib/__tests__/validations.test.ts` — Rewrite all tests for new schemas
- `src/app/api/profile/route.ts` — DELETE (link-in-bio artifact)
- `src/app/api/links/route.ts` — DELETE (link-in-bio artifact)
- `src/app/api/links/[id]/route.ts` — DELETE (link-in-bio artifact)
- `src/app/api/links/reorder/route.ts` — DELETE (link-in-bio artifact)
- `src/app/api/slug/check/route.ts` — DELETE (link-in-bio artifact)

### Directories to Delete

- `src/components/editor/` — All link-in-bio editor components
- `src/components/preview/` — Link-in-bio preview panel
- `src/components/themes/` — Link-in-bio theme components
- `src/hooks/use-profile.ts` — Link-in-bio profile hook
- `src/app/(dashboard)/editor/` — Link-in-bio editor page
- `drizzle/` — Old migration files; will be regenerated

### New Files to Create

- `src/app/(dashboard)/dashboard/page.tsx` — Placeholder owner dashboard (scaffolding only)
- `tests/e2e/run-all.sh` — Updated to remove link-in-bio E2E tests

### Relevant Documentation

- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg)
  - Why: Need `numeric`, `boolean`, `date`, `text().array()` — not used in old schema
- [Drizzle ORM Relations](https://orm.drizzle.team/docs/relations)
  - Why: More complex relation graph than before (circular refs between units/tenants must be handled carefully)

### Patterns to Follow

**Column naming (from existing schema):**
- TypeScript: camelCase (`ownerId`, `createdAt`, `plateNumber`)
- Database column name: explicit snake_case string (`"owner_id"`, `"created_at"`, `"plate_number"`)
- Always pass the explicit column name string to avoid Drizzle auto-casing surprises

**Index naming (from existing schema):**
```ts
index("idx_{table}_{column}").on(table.column)
uniqueIndex("idx_{table}_{column}").on(table.column)
```

**Primary keys:** `uuid().defaultRandom().primaryKey()` — matches existing pattern

**Timestamps:** `timestamp("created_at", { withTimezone: true }).defaultNow().notNull()` — always with timezone

**Foreign keys:**
```ts
ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" })
// nullable FK:
vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" })
```

**Financial amounts:** Use `numeric("amount", { precision: 10, scale: 2 })` — never float for money

**Boolean flags:** `boolean("is_preferred").notNull().default(false)`

**Date-only fields:** `date("start_date")` — for lease dates, payment due dates (no time component needed)

**Array columns:** `text("photos").array().notNull().default([])` — for maintenance photo URLs

**Drizzle relations pattern (from existing):**
```ts
export const ownersRelations = relations(owners, ({ many }) => ({
  properties: many(properties),
}));
export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(owners, { fields: [properties.ownerId], references: [owners.id] }),
  units: many(units),
}));
```

**API route auth pattern (from `src/app/api/profile/route.ts`):**
```ts
const { data } = await auth.getSession();
if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

**Rate limiting (from existing routes):**
```ts
const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
const { success } = apiRateLimiter.check(ip);
if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
```

---

## THE GROUNDWORK DATA MODEL (from PRD §6.2)

11 tables. Implement in this exact dependency order (no forward references):

```
owners → properties → units → tenants → vehicles
                            → leases
                            → payments
                            → maintenance_requests → (references vendors)
vendors (independent, references owners)
expenses → (references properties, maintenance_requests)
messages → (references units, maintenance_requests)
```

### Design Decisions

1. **No `current_tenant_id` on `units`**: The PRD lists it but it creates a circular foreign key (`units → tenants → units`). Derive "current tenant" from `tenants` where `unit_id = X AND move_out_date IS NULL`. Cleaner and consistent.

2. **`tenants.owner_id` denormalized**: Tenants belong to a unit which belongs to a property which belongs to an owner. Adding `owner_id` directly to `tenants` avoids a 3-join query for ownership checks on every API call.

3. **`owners` table extends Neon Auth user**: Same pattern as old `profiles.user_id` — `owners.user_id` references the Neon Auth user ID (text, not uuid).

4. **No Neon Auth for tenants**: Tenants authenticate via magic link in V2. In V1, the tenant portal is not in scope yet. `tenants` has no `user_id`.

5. **`messages.sender_id`**: Polymorphic reference — either `owners.id` or `tenants.id` depending on `sender_type`. No FK constraint (Postgres can't enforce polymorphic FKs). Validate at the application layer.

6. **Lease `status` is derived but stored**: Store `status` as a text field updated by a background job or on-read calculation. Simpler than always computing from dates. Values: `active | expiring_soon | month_to_month | expired`.

7. **`maintenance_requests.photos`**: Stored as `text[].` — array of S3 URLs. Added via upload flow in a later phase.

---

## IMPLEMENTATION PLAN

### Phase 1: Remove Link-in-Bio Artifacts

Delete all files that are specific to the link-in-bio app and have no value in Groundwork.

### Phase 2: New Database Schema

Replace `src/lib/db/schema.ts` with all 11 Groundwork tables and their relations.

### Phase 3: New TypeScript Types

Replace `src/types/index.ts` with Drizzle-inferred types + Groundwork domain types.

### Phase 4: New Zod Validation Schemas

Replace `src/lib/validations.ts` with input validation schemas for all Groundwork entities.

### Phase 5: Infrastructure Updates

Update middleware, env config, dashboard placeholder, E2E test runner.

### Phase 6: Database Migration

Drop old schema, generate new migration, push to Neon.

### Phase 7: Validation Tests

Rewrite `src/lib/__tests__/validations.test.ts` for new Zod schemas.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom.

---

### Task 1: DELETE Link-in-Bio API Routes

Remove all five API routes that only served the link-in-bio app.

```bash
rm -rf src/app/api/links
rm -f src/app/api/profile/route.ts
rm -rf src/app/api/profile
rm -f src/app/api/slug/check/route.ts
rm -rf src/app/api/slug
```

- **VALIDATE**: `ls src/app/api/` shows only `auth/`

---

### Task 2: DELETE Link-in-Bio UI Components and Hooks

```bash
rm -rf src/components/editor
rm -rf src/components/preview
rm -rf src/components/themes
rm -f src/hooks/use-profile.ts
rm -rf src/app/(dashboard)/editor
```

- **VALIDATE**: `ls src/components/` shows only `auth/` and `ui/`

---

### Task 3: DELETE Old Migration Files

```bash
rm -rf drizzle/
```

New migrations will be generated after the schema is written.

- **VALIDATE**: `ls drizzle/` returns "No such file or directory"

---

### Task 4: DELETE Old Link-in-Bio E2E Tests

```bash
rm -f tests/e2e/editor.sh tests/e2e/links.sh tests/e2e/reorder.sh
```

Keep `tests/e2e/signup.sh` and `tests/e2e/login.sh` — auth flows are still valid.

- **VALIDATE**: `ls tests/e2e/` shows only `login.sh signup.sh run-all.sh`

---

### Task 5: UPDATE `tests/e2e/run-all.sh`

Remove the deleted test entries. The runner should only reference tests that exist.

- **UPDATE** `tests/e2e/run-all.sh`: Remove the lines that run `editor.sh`, `links.sh`, `reorder.sh`. Update the header echo to say "Groundwork E2E Test Suite". Keep signup and login test entries.

- **VALIDATE**: `bash tests/e2e/run-all.sh --help 2>/dev/null || head -5 tests/e2e/run-all.sh` — file is clean

---

### Task 6: REPLACE `src/lib/db/schema.ts`

Complete replacement. Implement all 11 tables in dependency order.

**Required imports:**
```ts
import { relations } from "drizzle-orm";
import {
  boolean, date, index, integer, numeric,
  pgTable, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
```

**Tables to implement (in this exact order):**

**1. `owners`** — links to Neon Auth user
```ts
export const owners = pgTable(
  "owners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().unique(),        // Neon Auth user.id
    name: text("name").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    subscriptionTier: text("subscription_tier").notNull().default("starter"),
    stripeAccountId: text("stripe_account_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("idx_owners_user_id").on(t.userId)],
);
```

**2. `properties`**
```ts
export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zip: text("zip").notNull(),
    propertyType: text("property_type").notNull().default("single_family"),
    purchaseDate: date("purchase_date"),
    mortgagePayment: numeric("mortgage_payment", { precision: 10, scale: 2 }),
    notes: text("notes").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_properties_owner_id").on(t.ownerId)],
);
```

**3. `units`**
```ts
export const units = pgTable(
  "units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    unitNumber: text("unit_number").notNull().default(""),
    bedrooms: integer("bedrooms").notNull().default(1),
    bathrooms: integer("bathrooms").notNull().default(1),
    sqft: integer("sqft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_units_property_id").on(t.propertyId)],
);
```

**4. `vendors`** (before tenants — tenants don't reference vendors, but maintenance_requests do; define vendors here so maintenance_requests can reference it)
```ts
export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    trade: text("trade").notNull(),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    typicalRate: text("typical_rate").default(""),
    notes: text("notes").default(""),
    rating: integer("rating"),
    isPreferred: boolean("is_preferred").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_vendors_owner_id").on(t.ownerId)],
);
```

**5. `tenants`** — include `ownerId` for efficient ownership checks
```ts
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    dateOfBirth: date("date_of_birth"),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    moveInDate: date("move_in_date"),
    moveOutDate: date("move_out_date"),
    emergencyContactName: text("emergency_contact_name").default(""),
    emergencyContactRelationship: text("emergency_contact_relationship").default(""),
    emergencyContactPhone: text("emergency_contact_phone").default(""),
    emergencyContactEmail: text("emergency_contact_email").default(""),
    notes: text("notes").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_tenants_owner_id").on(t.ownerId),
    index("idx_tenants_unit_id").on(t.unitId),
  ],
);
```

**6. `vehicles`**
```ts
export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    color: text("color").notNull().default(""),
    plateNumber: text("plate_number").notNull(),
    plateState: text("plate_state").notNull(),
    parkingSpot: text("parking_spot").default(""),
    isAuthorized: boolean("is_authorized").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_vehicles_tenant_id").on(t.tenantId),
    index("idx_vehicles_plate_number").on(t.plateNumber),
  ],
);
```

**7. `leases`**
```ts
export const leases = pgTable(
  "leases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unitId: uuid("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    monthlyRent: numeric("monthly_rent", { precision: 10, scale: 2 }).notNull(),
    securityDeposit: numeric("security_deposit", { precision: 10, scale: 2 }).notNull().default("0"),
    status: text("status").notNull().default("active"),
    pdfUrl: text("pdf_url"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    lateFeePolicy: text("late_fee_policy").default(""),
    renewalStatus: text("renewal_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_leases_unit_id").on(t.unitId),
    index("idx_leases_tenant_id").on(t.tenantId),
    index("idx_leases_end_date").on(t.endDate),
    index("idx_leases_status").on(t.status),
  ],
);
```

**8. `payments`**
```ts
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    paidDate: date("paid_date"),
    method: text("method"),
    status: text("status").notNull().default("pending"),
    stripePaymentId: text("stripe_payment_id"),
    lateFeeAmount: numeric("late_fee_amount", { precision: 10, scale: 2 }).default("0"),
    notes: text("notes").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_payments_tenant_id").on(t.tenantId),
    index("idx_payments_unit_id").on(t.unitId),
    index("idx_payments_due_date").on(t.dueDate),
    index("idx_payments_status").on(t.status),
  ],
);
```

**9. `maintenanceRequests`**
```ts
export const maintenanceRequests = pgTable(
  "maintenance_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unitId: uuid("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    category: text("category").notNull(),
    urgency: text("urgency").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("received"),
    scheduledDate: date("scheduled_date"),
    photos: text("photos").array().notNull().default([]),
    budget: numeric("budget", { precision: 10, scale: 2 }),
    cost: numeric("cost", { precision: 10, scale: 2 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_maintenance_requests_unit_id").on(t.unitId),
    index("idx_maintenance_requests_tenant_id").on(t.tenantId),
    index("idx_maintenance_requests_urgency").on(t.urgency),
    index("idx_maintenance_requests_status").on(t.status),
  ],
);
```

**10. `expenses`**
```ts
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    maintenanceRequestId: uuid("maintenance_request_id").references(() => maintenanceRequests.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    date: date("date").notNull(),
    category: text("category").notNull(),
    payee: text("payee").notNull().default(""),
    notes: text("notes").default(""),
    receiptUrl: text("receipt_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_expenses_property_id").on(t.propertyId),
    index("idx_expenses_date").on(t.date),
    index("idx_expenses_category").on(t.category),
  ],
);
```

**11. `messages`**
```ts
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unitId: uuid("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
    maintenanceRequestId: uuid("maintenance_request_id").references(() => maintenanceRequests.id, { onDelete: "set null" }),
    senderType: text("sender_type").notNull(),  // 'owner' | 'tenant'
    senderId: uuid("sender_id").notNull(),       // polymorphic — no FK constraint
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_messages_unit_id").on(t.unitId),
    index("idx_messages_maintenance_request_id").on(t.maintenanceRequestId),
  ],
);
```

**Relations (define after all tables):**
```ts
export const ownersRelations = relations(owners, ({ many }) => ({
  properties: many(properties),
  vendors: many(vendors),
  tenants: many(tenants),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(owners, { fields: [properties.ownerId], references: [owners.id] }),
  units: many(units),
  expenses: many(expenses),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  property: one(properties, { fields: [units.propertyId], references: [properties.id] }),
  tenants: many(tenants),
  leases: many(leases),
  payments: many(payments),
  maintenanceRequests: many(maintenanceRequests),
  messages: many(messages),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  owner: one(owners, { fields: [vendors.ownerId], references: [owners.id] }),
  maintenanceRequests: many(maintenanceRequests),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  owner: one(owners, { fields: [tenants.ownerId], references: [owners.id] }),
  unit: one(units, { fields: [tenants.unitId], references: [units.id] }),
  vehicles: many(vehicles),
  leases: many(leases),
  payments: many(payments),
  maintenanceRequests: many(maintenanceRequests),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  tenant: one(tenants, { fields: [vehicles.tenantId], references: [tenants.id] }),
}));

export const leasesRelations = relations(leases, ({ one }) => ({
  unit: one(units, { fields: [leases.unitId], references: [units.id] }),
  tenant: one(tenants, { fields: [leases.tenantId], references: [tenants.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, { fields: [payments.tenantId], references: [tenants.id] }),
  unit: one(units, { fields: [payments.unitId], references: [units.id] }),
}));

export const maintenanceRequestsRelations = relations(maintenanceRequests, ({ one, many }) => ({
  unit: one(units, { fields: [maintenanceRequests.unitId], references: [units.id] }),
  tenant: one(tenants, { fields: [maintenanceRequests.tenantId], references: [tenants.id] }),
  vendor: one(vendors, { fields: [maintenanceRequests.vendorId], references: [vendors.id] }),
  expenses: many(expenses),
  messages: many(messages),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  property: one(properties, { fields: [expenses.propertyId], references: [properties.id] }),
  maintenanceRequest: one(maintenanceRequests, { fields: [expenses.maintenanceRequestId], references: [maintenanceRequests.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  unit: one(units, { fields: [messages.unitId], references: [units.id] }),
  maintenanceRequest: one(maintenanceRequests, { fields: [messages.maintenanceRequestId], references: [maintenanceRequests.id] }),
}));
```

- **IMPORTS**: `boolean, date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid` from `"drizzle-orm/pg-core"` + `relations` from `"drizzle-orm"`
- **GOTCHA**: `numeric` default values must be passed as strings: `.default("0")` not `.default(0)`
- **GOTCHA**: `text().array()` for the photos column — Drizzle uses Postgres native array type
- **GOTCHA**: No circular foreign keys — `units` does NOT reference `tenants`; derive current tenant via query
- **VALIDATE**: `npx tsc --noEmit` — no type errors

---

### Task 7: REPLACE `src/types/index.ts`

Complete replacement with Drizzle-inferred types and Groundwork domain types.

```ts
import type { InferSelectModel } from "drizzle-orm";
import type {
  expenses, leases, maintenanceRequests, messages,
  owners, payments, properties, tenants, units, vehicles, vendors,
} from "@/lib/db/schema";

// Drizzle-inferred row types
export type Owner = InferSelectModel<typeof owners>;
export type Property = InferSelectModel<typeof properties>;
export type Unit = InferSelectModel<typeof units>;
export type Tenant = InferSelectModel<typeof tenants>;
export type Vehicle = InferSelectModel<typeof vehicles>;
export type Lease = InferSelectModel<typeof leases>;
export type Payment = InferSelectModel<typeof payments>;
export type MaintenanceRequest = InferSelectModel<typeof maintenanceRequests>;
export type Vendor = InferSelectModel<typeof vendors>;
export type Expense = InferSelectModel<typeof expenses>;
export type Message = InferSelectModel<typeof messages>;

// Domain enums
export type SubscriptionTier = "starter" | "growth" | "portfolio";
export type PropertyType = "single_family" | "multi_unit" | "condo" | "townhouse";
export type LeaseStatus = "active" | "expiring_soon" | "month_to_month" | "expired";
export type LeaseRenewalStatus = "in_progress" | "offered" | "signed" | "not_renewing";
export type MaintenanceCategory = "Plumbing" | "Electrical" | "HVAC" | "Appliance" | "Structural" | "Pest" | "Other";
export type MaintenanceUrgency = "Emergency" | "Urgent" | "Routine";
export type MaintenanceStatus = "received" | "assigned" | "in_progress" | "scheduled" | "resolved";
export type PaymentStatus = "pending" | "paid" | "late" | "partial" | "failed";
export type PaymentMethod = "ach" | "card" | "cash" | "check" | "zelle" | "venmo" | "other";
export type ExpenseCategory =
  | "Maintenance/Repair" | "Mortgage" | "Insurance" | "Property Tax"
  | "Utilities" | "Landscaping" | "Pest Control" | "Management Fee"
  | "Capital Improvement" | "Other";
export type MessageSenderType = "owner" | "tenant";
export type VendorTrade =
  | "Plumber" | "Electrician" | "HVAC" | "Handyman"
  | "Pest Control" | "Landscaping" | "Other";

// Composite API response types
export interface UnitWithTenant extends Unit {
  currentTenant: Tenant | null;
  activeLease: Lease | null;
}

export interface PropertyWithUnits extends Property {
  units: UnitWithTenant[];
}
```

- **VALIDATE**: `npx tsc --noEmit` — no type errors

---

### Task 8: REPLACE `src/lib/validations.ts`

Complete replacement with Groundwork Zod schemas.

```ts
import { z } from "zod";

// ── Owners ────────────────────────────────────────────
export const ownerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(20).default(""),
});

// ── Properties ────────────────────────────────────────
export const propertySchema = z.object({
  address: z.string().min(1, "Address is required").max(200),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(2).max(2, "Use 2-letter state code"),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  propertyType: z.enum(["single_family", "multi_unit", "condo", "townhouse"]),
  purchaseDate: z.string().date().optional().nullable(),
  mortgagePayment: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(2000).default(""),
});

// ── Units ─────────────────────────────────────────────
export const unitSchema = z.object({
  unitNumber: z.string().max(20).default(""),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().int().min(0).max(20),
  sqft: z.number().int().positive().optional().nullable(),
});

// ── Tenants ───────────────────────────────────────────
export const tenantSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(200),
  phone: z.string().max(20).default(""),
  email: z.string().email("Invalid email").or(z.literal("")).default(""),
  moveInDate: z.string().date().optional().nullable(),
  notes: z.string().max(5000).default(""),
});

export const emergencyContactSchema = z.object({
  name: z.string().max(200).default(""),
  relationship: z.string().max(100).default(""),
  phone: z.string().max(20).default(""),
  email: z.string().email().or(z.literal("")).default(""),
});

// ── Vehicles ──────────────────────────────────────────
export const vehicleSchema = z.object({
  make: z.string().min(1, "Make is required").max(50),
  model: z.string().min(1, "Model is required").max(50),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().max(50).default(""),
  plateNumber: z.string().min(1, "License plate is required").max(10).toUpperCase(),
  plateState: z.string().min(2).max(2, "Use 2-letter state code").toUpperCase(),
  parkingSpot: z.string().max(20).default(""),
  isAuthorized: z.boolean().default(true),
});

// ── Leases ────────────────────────────────────────────
export const leaseSchema = z.object({
  startDate: z.string().date("Invalid start date"),
  endDate: z.string().date("Invalid end date"),
  monthlyRent: z.number().positive("Monthly rent must be positive"),
  securityDeposit: z.number().nonnegative().default(0),
  lateFeePolicy: z.string().max(500).default(""),
  renewalStatus: z.enum(["in_progress", "offered", "signed", "not_renewing"]).optional().nullable(),
}).refine(
  (d) => new Date(d.endDate) > new Date(d.startDate),
  { message: "End date must be after start date", path: ["endDate"] },
);

// ── Vendors ───────────────────────────────────────────
export const vendorSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  trade: z.enum(["Plumber", "Electrician", "HVAC", "Handyman", "Pest Control", "Landscaping", "Other"]),
  phone: z.string().max(20).default(""),
  email: z.string().email().or(z.literal("")).default(""),
  typicalRate: z.string().max(100).default(""),
  notes: z.string().max(2000).default(""),
  isPreferred: z.boolean().default(false),
});

export const vendorRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

// ── Maintenance Requests ───────────────────────────────
export const maintenanceRequestSchema = z.object({
  category: z.enum(["Plumbing", "Electrical", "HVAC", "Appliance", "Structural", "Pest", "Other"]),
  urgency: z.enum(["Emergency", "Urgent", "Routine"]),
  description: z.string().min(1, "Description is required").max(5000),
  budget: z.number().nonnegative().optional().nullable(),
});

export const maintenanceStatusSchema = z.object({
  status: z.enum(["received", "assigned", "in_progress", "scheduled", "resolved"]),
  scheduledDate: z.string().date().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
});

// ── Payments ──────────────────────────────────────────
export const paymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.string().date("Invalid due date"),
  method: z.enum(["ach", "card", "cash", "check", "zelle", "venmo", "other"]).optional().nullable(),
  notes: z.string().max(500).default(""),
});

export const paymentStatusSchema = z.object({
  status: z.enum(["pending", "paid", "late", "partial", "failed"]),
  paidDate: z.string().date().optional().nullable(),
  lateFeeAmount: z.number().nonnegative().default(0),
});

// ── Expenses ──────────────────────────────────────────
export const expenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.string().date("Invalid date"),
  category: z.enum([
    "Maintenance/Repair", "Mortgage", "Insurance", "Property Tax",
    "Utilities", "Landscaping", "Pest Control", "Management Fee",
    "Capital Improvement", "Other",
  ]),
  payee: z.string().max(200).default(""),
  notes: z.string().max(2000).default(""),
  maintenanceRequestId: z.string().uuid().optional().nullable(),
});

// ── Messages ──────────────────────────────────────────
export const messageSchema = z.object({
  body: z.string().min(1, "Message cannot be empty").max(5000),
  maintenanceRequestId: z.string().uuid().optional().nullable(),
});
```

- **VALIDATE**: `npx tsc --noEmit`

---

### Task 9: UPDATE `src/middleware.ts`

Change the protected route matcher from link-in-bio routes to Groundwork owner routes.

- **UPDATE** only the `config.matcher` array:
```ts
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/properties/:path*",
    "/tenants/:path*",
    "/maintenance/:path*",
    "/expenses/:path*",
    "/vendors/:path*",
    "/settings/:path*",
  ],
};
```

Keep the session cookie check logic unchanged — it's not link-in-bio specific.

- **VALIDATE**: `npx tsc --noEmit`

---

### Task 10: UPDATE `.env.example`

Add the environment variables needed for Groundwork features defined in the PRD.

```env
# Neon Database
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Neon Auth
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=generate-with-openssl-rand-base64-32

# Stripe (rent collection, Connect payouts)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# SendGrid (email notifications, reminders, receipts)
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@groundwork.app

# Twilio (SMS for vendor work orders, tenant payment reminders)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_PHONE=+1...

# AWS S3 (lease PDFs, maintenance photos, receipt images)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=groundwork-uploads

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### Task 11: CREATE Placeholder Dashboard Route

The middleware now protects `/dashboard`. Create a minimal placeholder so the route doesn't 404 after auth.

- **CREATE** `src/app/(dashboard)/dashboard/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-2">Groundwork owner dashboard — coming soon.</p>
    </div>
  );
}
```

- **UPDATE** `src/app/(dashboard)/layout.tsx` to remove any link-in-bio-specific references (editor nav links, etc.). Replace with a minimal shell:
```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
```

- **VALIDATE**: `npm run build` — no import errors on these files

---

### Task 12: GENERATE and PUSH New Schema

Run Drizzle commands to generate the new migration and sync to the Neon database.

```bash
npm run db:generate
npm run db:push
```

- **GOTCHA**: `db:push` will drop tables that no longer exist in the schema (`profiles`, `link_items`, `click_events`). This is correct — those tables must go.
- **GOTCHA**: If the Neon database has no `DATABASE_URL` in `.env.local`, this will fail. Ensure `.env.local` is populated.
- **VALIDATE**: `npm run db:studio` — opens Drizzle Studio; verify all 11 new tables appear with correct columns

---

### Task 13: REWRITE `src/lib/__tests__/validations.test.ts`

Replace all link-in-bio tests with Groundwork validation tests.

Test coverage to implement:

**`propertySchema`:**
- Valid property passes
- Missing address fails
- Invalid ZIP format fails (e.g. "1234", "ABCDE")
- Valid 5-digit and 9-digit ZIP passes
- State must be exactly 2 chars

**`unitSchema`:**
- Valid unit passes
- Negative bedrooms fails
- Bedrooms > 20 fails

**`tenantSchema`:**
- Valid tenant passes
- Empty fullName fails
- Invalid email format fails
- Empty email passes (optional)

**`vehicleSchema`:**
- Valid vehicle passes
- Year < 1900 fails
- Year > current year + 1 fails
- Empty plateNumber fails
- State must be 2 chars

**`leaseSchema`:**
- Valid lease passes
- endDate before startDate fails (cross-field refinement)
- Negative monthlyRent fails
- Zero monthlyRent fails

**`vendorSchema`:**
- Valid vendor passes
- Invalid trade value fails (not in enum)
- Empty name fails

**`maintenanceRequestSchema`:**
- Valid request passes
- Invalid urgency fails
- Empty description fails

**`expenseSchema`:**
- Valid expense passes
- Zero amount fails
- Invalid category fails
- Invalid date format fails

**`messageSchema`:**
- Valid message passes
- Empty body fails

- **VALIDATE**: `npm run test:run` — all tests pass

---

### Task 14: FINAL VALIDATION SWEEP

```bash
npx tsc --noEmit      # Zero type errors
npm run lint          # Zero Biome errors
npm run test:run      # All unit tests pass
npm run build         # Production build succeeds
```

If any import fails because a deleted file is still referenced, track down the importer and remove the import.

---

## TESTING STRATEGY

### Unit Tests (Vitest)

Focus on Zod schema validation — these are pure functions with no DB dependency.

Each schema gets: valid input pass, required field missing fail, boundary value tests, cross-field refinement tests (leaseSchema end > start).

### Integration Tests

Not in scope for this phase — no API routes are being built. Schema-level integrity is validated via `db:push` success and Drizzle Studio inspection.

### Edge Cases to Test

- `leaseSchema`: end date exactly equal to start date should fail
- `vehicleSchema`: plateNumber should uppercase automatically (`.toUpperCase()`)
- `propertySchema`: state exactly 2 chars (not 1, not 3)
- `expenseSchema`: amount = 0 fails, amount = 0.01 passes

---

## VALIDATION COMMANDS

### Level 1: Type Check
```bash
npx tsc --noEmit
```

### Level 2: Lint
```bash
npm run lint
```

### Level 3: Unit Tests
```bash
npm run test:run
```

### Level 4: Build
```bash
npm run build
```

### Level 5: Schema Inspection
```bash
npm run db:studio
```
Visually confirm all 11 tables, column types, and indexes.

---

## ACCEPTANCE CRITERIA

- [ ] `profiles`, `link_items`, `click_events` tables removed from schema
- [ ] All 11 Groundwork tables defined: owners, properties, units, tenants, vehicles, leases, payments, maintenance_requests, vendors, expenses, messages
- [ ] All relations defined correctly
- [ ] `numeric` used for all financial columns (no floats)
- [ ] `date` used for date-only columns (lease dates, payment due dates)
- [ ] `text().array()` used for maintenance_requests.photos
- [ ] `boolean` used for `is_authorized`, `is_preferred`
- [ ] Index naming follows `idx_{table}_{column}` convention
- [ ] All TypeScript types derived from Drizzle schema via `InferSelectModel`
- [ ] All domain enum types exported from `src/types/index.ts`
- [ ] Zod schemas cover all 11 entities' create/update inputs
- [ ] Old link-in-bio API routes deleted
- [ ] Old link-in-bio components deleted
- [ ] Old migration files deleted and replaced with new Groundwork migration
- [ ] Middleware protects `/dashboard`, `/properties`, `/tenants`, `/maintenance`, `/expenses`, `/vendors`, `/settings`
- [ ] `.env.example` includes Stripe, SendGrid, Twilio, AWS S3 vars
- [ ] Placeholder `/dashboard` route exists and doesn't 404
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run test:run` — all validation tests pass
- [ ] `npm run build` — zero errors

---

## COMPLETION CHECKLIST

- [ ] Tasks 1–5: All link-in-bio artifacts deleted
- [ ] Task 6: New schema written with all 11 tables
- [ ] Task 7: Types updated
- [ ] Task 8: Validations updated
- [ ] Task 9: Middleware updated
- [ ] Task 10: .env.example updated
- [ ] Task 11: Dashboard placeholder created
- [ ] Task 12: Migration generated and pushed
- [ ] Task 13: Validation tests rewritten and passing
- [ ] Task 14: Full validation sweep passes

---

## NOTES

**Why `numeric` over `real`/`float`:** Financial amounts stored as floats accumulate rounding errors. `NUMERIC(10,2)` in Postgres is exact. Drizzle returns these as strings from the database — parse to `Number()` at the UI layer only.

**Migration strategy:** Since the existing `profiles`/`link_items`/`click_events` tables have no production data worth preserving, we delete the old migration directory and generate a clean `0000_...` migration. This keeps the drizzle migration history clean.

**Tenant auth portal (V2):** When tenant portal auth is built (magic link), add `portalToken` and `portalTokenExpiresAt` columns to the `tenants` table in a new migration. No changes needed now.

**Confidence Score: 9/10** — All patterns are directly mirrored from the existing codebase. The only risk is the `db:push` step dropping old tables if `DATABASE_URL` isn't configured in `.env.local` — that's an env setup issue, not a code issue.
