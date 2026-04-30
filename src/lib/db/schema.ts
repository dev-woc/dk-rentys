import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

// ── Owners ────────────────────────────────────────────────────────────────────
export const owners = pgTable(
	"owners",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id").notNull().unique(),
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

// ── Properties ────────────────────────────────────────────────────────────────
export const properties = pgTable(
	"properties",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.notNull()
			.references(() => owners.id, { onDelete: "cascade" }),
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

// ── Units ─────────────────────────────────────────────────────────────────────
export const units = pgTable(
	"units",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		propertyId: uuid("property_id")
			.notNull()
			.references(() => properties.id, { onDelete: "cascade" }),
		unitNumber: text("unit_number").notNull().default(""),
		bedrooms: integer("bedrooms").notNull().default(1),
		bathrooms: integer("bathrooms").notNull().default(1),
		sqft: integer("sqft"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(t) => [index("idx_units_property_id").on(t.propertyId)],
);

// ── Vendors ───────────────────────────────────────────────────────────────────
export const vendors = pgTable(
	"vendors",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.notNull()
			.references(() => owners.id, { onDelete: "cascade" }),
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

// ── Tenants ───────────────────────────────────────────────────────────────────
export const tenants = pgTable(
	"tenants",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: uuid("owner_id")
			.notNull()
			.references(() => owners.id, { onDelete: "cascade" }),
		authUserId: text("auth_user_id"),
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
		uniqueIndex("idx_tenants_auth_user_id").on(t.authUserId),
	],
);

// ── Vehicles ──────────────────────────────────────────────────────────────────
export const vehicles = pgTable(
	"vehicles",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
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

// ── Leases ────────────────────────────────────────────────────────────────────
export const leases = pgTable(
	"leases",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		unitId: uuid("unit_id")
			.notNull()
			.references(() => units.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		startDate: date("start_date").notNull(),
		endDate: date("end_date").notNull(),
		monthlyRent: numeric("monthly_rent", { precision: 10, scale: 2 }).notNull(),
		securityDeposit: numeric("security_deposit", { precision: 10, scale: 2 })
			.notNull()
			.default("0"),
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

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = pgTable(
	"payments",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		unitId: uuid("unit_id")
			.notNull()
			.references(() => units.id, { onDelete: "cascade" }),
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

// ── Maintenance Requests ──────────────────────────────────────────────────────
export const maintenanceRequests = pgTable(
	"maintenance_requests",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		unitId: uuid("unit_id")
			.notNull()
			.references(() => units.id, { onDelete: "cascade" }),
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

// ── Expenses ──────────────────────────────────────────────────────────────────
export const expenses = pgTable(
	"expenses",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		propertyId: uuid("property_id")
			.notNull()
			.references(() => properties.id, { onDelete: "cascade" }),
		maintenanceRequestId: uuid("maintenance_request_id").references(() => maintenanceRequests.id, {
			onDelete: "set null",
		}),
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

// ── Messages ──────────────────────────────────────────────────────────────────
export const messages = pgTable(
	"messages",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		unitId: uuid("unit_id")
			.notNull()
			.references(() => units.id, { onDelete: "cascade" }),
		maintenanceRequestId: uuid("maintenance_request_id").references(() => maintenanceRequests.id, {
			onDelete: "set null",
		}),
		senderType: text("sender_type").notNull(),
		senderId: uuid("sender_id").notNull(),
		body: text("body").notNull(),
		readAt: timestamp("read_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(t) => [
		index("idx_messages_unit_id").on(t.unitId),
		index("idx_messages_maintenance_request_id").on(t.maintenanceRequestId),
	],
);

// ── Relations ─────────────────────────────────────────────────────────────────
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
	tenant: one(tenants, {
		fields: [maintenanceRequests.tenantId],
		references: [tenants.id],
	}),
	vendor: one(vendors, {
		fields: [maintenanceRequests.vendorId],
		references: [vendors.id],
	}),
	expenses: many(expenses),
	messages: many(messages),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
	property: one(properties, { fields: [expenses.propertyId], references: [properties.id] }),
	maintenanceRequest: one(maintenanceRequests, {
		fields: [expenses.maintenanceRequestId],
		references: [maintenanceRequests.id],
	}),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
	unit: one(units, { fields: [messages.unitId], references: [units.id] }),
	maintenanceRequest: one(maintenanceRequests, {
		fields: [messages.maintenanceRequestId],
		references: [maintenanceRequests.id],
	}),
}));
