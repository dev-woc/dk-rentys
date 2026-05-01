import { z } from "zod";

// ── Owners ────────────────────────────────────────────────────────────────────
export const ownerSchema = z.object({
	name: z.string().min(1, "Name is required").max(100),
	phone: z.string().max(20).default(""),
});

// ── Properties ────────────────────────────────────────────────────────────────
export const propertySchema = z.object({
	address: z.string().min(1, "Address is required").max(200),
	city: z.string().min(1, "City is required").max(100),
	state: z.string().length(2, "Use 2-letter state code").toUpperCase(),
	zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
	propertyType: z.enum(["single_family", "multi_unit", "condo", "townhouse"]),
	purchaseDate: z.string().date().optional().nullable(),
	mortgagePayment: z.number().nonnegative().optional().nullable(),
	notes: z.string().max(2000).default(""),
});

// ── Units ─────────────────────────────────────────────────────────────────────
export const unitSchema = z.object({
	unitNumber: z.string().max(20).default(""),
	bedrooms: z.number().int().min(0).max(20),
	bathrooms: z.number().int().min(0).max(20),
	sqft: z.number().int().positive().optional().nullable(),
});

// ── Tenants ───────────────────────────────────────────────────────────────────
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

// ── Vehicles ──────────────────────────────────────────────────────────────────
export const vehicleSchema = z.object({
	make: z.string().min(1, "Make is required").max(50),
	model: z.string().min(1, "Model is required").max(50),
	year: z
		.number()
		.int()
		.min(1900)
		.max(new Date().getFullYear() + 1),
	color: z.string().max(50).default(""),
	plateNumber: z.string().min(1, "License plate is required").max(10).toUpperCase(),
	plateState: z.string().length(2, "Use 2-letter state code").toUpperCase(),
	parkingSpot: z.string().max(20).default(""),
	isAuthorized: z.boolean().default(true),
});

// ── Leases ────────────────────────────────────────────────────────────────────
export const leaseSchema = z
	.object({
		startDate: z.string().date("Invalid start date"),
		endDate: z.string().date("Invalid end date"),
		monthlyRent: z.number().positive("Monthly rent must be positive"),
		securityDeposit: z.number().nonnegative().default(0),
		lateFeePolicy: z.string().max(500).default(""),
		renewalStatus: z
			.enum(["in_progress", "offered", "signed", "not_renewing"])
			.optional()
			.nullable(),
	})
	.refine((d) => new Date(d.endDate) > new Date(d.startDate), {
		message: "End date must be after start date",
		path: ["endDate"],
	});

// ── Vendors ───────────────────────────────────────────────────────────────────
export const vendorSchema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	trade: z.enum([
		"Plumber",
		"Electrician",
		"HVAC",
		"Handyman",
		"Pest Control",
		"Landscaping",
		"Other",
	]),
	phone: z.string().max(20).default(""),
	email: z.string().email().or(z.literal("")).default(""),
	typicalRate: z.string().max(100).default(""),
	notes: z.string().max(2000).default(""),
	isPreferred: z.boolean().default(false),
});

export const vendorRatingSchema = z.object({
	rating: z.number().int().min(1).max(5),
});

// ── Maintenance Requests ───────────────────────────────────────────────────────
export const maintenanceRequestSchema = z.object({
	category: z.enum(["Plumbing", "Electrical", "HVAC", "Appliance", "Structural", "Pest", "Other"]),
	urgency: z.enum(["Emergency", "Urgent", "Routine"]),
	description: z.string().min(1, "Description is required").max(5000),
	budget: z.number().nonnegative().optional().nullable(),
	photos: z.array(z.url("Photo must be a valid URL")).max(8).default([]),
});

export const maintenanceStatusSchema = z.object({
	status: z.enum(["received", "assigned", "in_progress", "scheduled", "resolved"]),
	scheduledDate: z.string().date().optional().nullable(),
	vendorId: z.string().uuid().optional().nullable(),
	cost: z.number().nonnegative().optional().nullable(),
});

// ── Payments ──────────────────────────────────────────────────────────────────
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

// ── Expenses ──────────────────────────────────────────────────────────────────
export const expenseSchema = z.object({
	amount: z.number().positive("Amount must be positive"),
	date: z.string().date("Invalid date"),
	category: z.enum([
		"Maintenance/Repair",
		"Mortgage",
		"Insurance",
		"Property Tax",
		"Utilities",
		"Landscaping",
		"Pest Control",
		"Management Fee",
		"Capital Improvement",
		"Other",
	]),
	payee: z.string().max(200).default(""),
	notes: z.string().max(2000).default(""),
	maintenanceRequestId: z.string().uuid().optional().nullable(),
});

// ── Messages ──────────────────────────────────────────────────────────────────
export const messageSchema = z.object({
	body: z.string().min(1, "Message cannot be empty").max(5000),
	maintenanceRequestId: z.string().uuid().optional().nullable(),
});
