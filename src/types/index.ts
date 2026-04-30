import type { InferSelectModel } from "drizzle-orm";
import type {
	expenses,
	leases,
	maintenanceRequests,
	messages,
	owners,
	payments,
	properties,
	tenants,
	units,
	vehicles,
	vendors,
} from "@/lib/db/schema";

// ── Drizzle-inferred row types ─────────────────────────────────────────────────
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

// ── Domain enums ───────────────────────────────────────────────────────────────
export type SubscriptionTier = "starter" | "growth" | "portfolio";
export type PropertyType = "single_family" | "multi_unit" | "condo" | "townhouse";
export type LeaseStatus = "active" | "expiring_soon" | "month_to_month" | "expired";
export type LeaseRenewalStatus = "in_progress" | "offered" | "signed" | "not_renewing";
export type MaintenanceCategory =
	| "Plumbing"
	| "Electrical"
	| "HVAC"
	| "Appliance"
	| "Structural"
	| "Pest"
	| "Other";
export type MaintenanceUrgency = "Emergency" | "Urgent" | "Routine";
export type MaintenanceStatus = "received" | "assigned" | "in_progress" | "scheduled" | "resolved";
export type PaymentStatus = "pending" | "paid" | "late" | "partial" | "failed";
export type PaymentMethod = "ach" | "card" | "cash" | "check" | "zelle" | "venmo" | "other";
export type ExpenseCategory =
	| "Maintenance/Repair"
	| "Mortgage"
	| "Insurance"
	| "Property Tax"
	| "Utilities"
	| "Landscaping"
	| "Pest Control"
	| "Management Fee"
	| "Capital Improvement"
	| "Other";
export type MessageSenderType = "owner" | "tenant";
export type VendorTrade =
	| "Plumber"
	| "Electrician"
	| "HVAC"
	| "Handyman"
	| "Pest Control"
	| "Landscaping"
	| "Other";

// ── Composite API response types ───────────────────────────────────────────────
export interface UnitWithTenants extends Unit {
	tenants: Tenant[];
	leases?: Lease[];
}

export interface PropertyWithUnits extends Property {
	units: UnitWithTenants[];
}

export interface TenantWithDetails extends Tenant {
	vehicles: Vehicle[];
	leases: Lease[];
	payments: Payment[];
	unit?: (Unit & { property: Property }) | null;
}

export interface PaymentWithDetails extends Payment {
	tenant: Tenant;
	unit: Unit & { property: Property };
}

export interface MaintenanceRequestWithDetails extends MaintenanceRequest {
	unit: Unit & { property: Property };
	tenant?: Tenant | null;
	vendor?: Vendor | null;
}

export interface TenantPortalProfile extends Tenant {
	unit?: (Unit & { property: Property }) | null;
	leases: Lease[];
	payments: Payment[];
	maintenanceRequests: MaintenanceRequestWithDetails[];
}
