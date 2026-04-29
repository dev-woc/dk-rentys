import { describe, expect, it } from "vitest";
import {
	expenseSchema,
	leaseSchema,
	maintenanceRequestSchema,
	messageSchema,
	propertySchema,
	tenantSchema,
	unitSchema,
	vehicleSchema,
	vendorSchema,
} from "../validations";

describe("propertySchema", () => {
	const valid = {
		address: "123 Main St",
		city: "Austin",
		state: "TX",
		zip: "78701",
		propertyType: "single_family" as const,
		notes: "",
	};

	it("accepts a valid property", () => {
		expect(propertySchema.safeParse(valid).success).toBe(true);
	});

	it("accepts a 9-digit ZIP", () => {
		expect(propertySchema.safeParse({ ...valid, zip: "78701-1234" }).success).toBe(true);
	});

	it("rejects a missing address", () => {
		expect(propertySchema.safeParse({ ...valid, address: "" }).success).toBe(false);
	});

	it("rejects an invalid ZIP", () => {
		expect(propertySchema.safeParse({ ...valid, zip: "1234" }).success).toBe(false);
		expect(propertySchema.safeParse({ ...valid, zip: "ABCDE" }).success).toBe(false);
	});

	it("rejects a state that is not exactly 2 chars", () => {
		expect(propertySchema.safeParse({ ...valid, state: "T" }).success).toBe(false);
		expect(propertySchema.safeParse({ ...valid, state: "TEX" }).success).toBe(false);
	});

	it("rejects an invalid property type", () => {
		expect(propertySchema.safeParse({ ...valid, propertyType: "mansion" }).success).toBe(false);
	});
});

describe("unitSchema", () => {
	const valid = { bedrooms: 2, bathrooms: 1, unitNumber: "" };

	it("accepts a valid unit", () => {
		expect(unitSchema.safeParse(valid).success).toBe(true);
	});

	it("rejects negative bedrooms", () => {
		expect(unitSchema.safeParse({ ...valid, bedrooms: -1 }).success).toBe(false);
	});

	it("rejects bedrooms over 20", () => {
		expect(unitSchema.safeParse({ ...valid, bedrooms: 21 }).success).toBe(false);
	});

	it("accepts bedrooms at 0", () => {
		expect(unitSchema.safeParse({ ...valid, bedrooms: 0 }).success).toBe(true);
	});
});

describe("tenantSchema", () => {
	const valid = { fullName: "Jane Smith", phone: "555-1234", email: "", notes: "" };

	it("accepts a valid tenant", () => {
		expect(tenantSchema.safeParse(valid).success).toBe(true);
	});

	it("rejects an empty fullName", () => {
		expect(tenantSchema.safeParse({ ...valid, fullName: "" }).success).toBe(false);
	});

	it("rejects an invalid email", () => {
		expect(tenantSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
	});

	it("accepts an empty email", () => {
		expect(tenantSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
	});

	it("accepts a valid email", () => {
		expect(tenantSchema.safeParse({ ...valid, email: "jane@example.com" }).success).toBe(true);
	});
});

describe("vehicleSchema", () => {
	const valid = {
		make: "Toyota",
		model: "Camry",
		year: 2020,
		color: "Blue",
		plateNumber: "ABC1234",
		plateState: "TX",
		parkingSpot: "",
		isAuthorized: true,
	};

	it("accepts a valid vehicle", () => {
		expect(vehicleSchema.safeParse(valid).success).toBe(true);
	});

	it("rejects year before 1900", () => {
		expect(vehicleSchema.safeParse({ ...valid, year: 1899 }).success).toBe(false);
	});

	it("rejects year more than 1 year in the future", () => {
		const tooFar = new Date().getFullYear() + 2;
		expect(vehicleSchema.safeParse({ ...valid, year: tooFar }).success).toBe(false);
	});

	it("rejects an empty plateNumber", () => {
		expect(vehicleSchema.safeParse({ ...valid, plateNumber: "" }).success).toBe(false);
	});

	it("rejects a state that is not exactly 2 chars", () => {
		expect(vehicleSchema.safeParse({ ...valid, plateState: "T" }).success).toBe(false);
		expect(vehicleSchema.safeParse({ ...valid, plateState: "TEX" }).success).toBe(false);
	});

	it("uppercases the plateNumber", () => {
		const result = vehicleSchema.safeParse({ ...valid, plateNumber: "abc123" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.plateNumber).toBe("ABC123");
	});
});

describe("leaseSchema", () => {
	const valid = {
		startDate: "2025-01-01",
		endDate: "2026-01-01",
		monthlyRent: 1500,
		securityDeposit: 1500,
		lateFeePolicy: "",
	};

	it("accepts a valid lease", () => {
		expect(leaseSchema.safeParse(valid).success).toBe(true);
	});

	it("rejects endDate before startDate", () => {
		expect(leaseSchema.safeParse({ ...valid, endDate: "2024-12-31" }).success).toBe(false);
	});

	it("rejects endDate equal to startDate", () => {
		expect(leaseSchema.safeParse({ ...valid, endDate: "2025-01-01" }).success).toBe(false);
	});

	it("rejects zero monthlyRent", () => {
		expect(leaseSchema.safeParse({ ...valid, monthlyRent: 0 }).success).toBe(false);
	});

	it("rejects negative monthlyRent", () => {
		expect(leaseSchema.safeParse({ ...valid, monthlyRent: -100 }).success).toBe(false);
	});

	it("accepts zero securityDeposit", () => {
		expect(leaseSchema.safeParse({ ...valid, securityDeposit: 0 }).success).toBe(true);
	});
});

describe("vendorSchema", () => {
	const valid = {
		name: "Bob's Plumbing",
		trade: "Plumber" as const,
		phone: "555-9876",
		email: "",
		typicalRate: "$85/hr",
		notes: "",
		isPreferred: false,
	};

	it("accepts a valid vendor", () => {
		expect(vendorSchema.safeParse(valid).success).toBe(true);
	});

	it("rejects an empty name", () => {
		expect(vendorSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
	});

	it("rejects an invalid trade", () => {
		expect(vendorSchema.safeParse({ ...valid, trade: "Magician" }).success).toBe(false);
	});

	it("accepts all valid trades", () => {
		const trades = [
			"Plumber",
			"Electrician",
			"HVAC",
			"Handyman",
			"Pest Control",
			"Landscaping",
			"Other",
		] as const;
		for (const trade of trades) {
			expect(vendorSchema.safeParse({ ...valid, trade }).success).toBe(true);
		}
	});
});

describe("maintenanceRequestSchema", () => {
	const valid = {
		category: "Plumbing" as const,
		urgency: "Routine" as const,
		description: "Leaky faucet in kitchen",
	};

	it("accepts a valid maintenance request", () => {
		expect(maintenanceRequestSchema.safeParse(valid).success).toBe(true);
	});

	it("rejects an invalid urgency", () => {
		expect(maintenanceRequestSchema.safeParse({ ...valid, urgency: "Low" }).success).toBe(false);
	});

	it("rejects an invalid category", () => {
		expect(maintenanceRequestSchema.safeParse({ ...valid, category: "Roof" }).success).toBe(false);
	});

	it("rejects an empty description", () => {
		expect(maintenanceRequestSchema.safeParse({ ...valid, description: "" }).success).toBe(false);
	});

	it("accepts all valid urgency levels", () => {
		for (const urgency of ["Emergency", "Urgent", "Routine"] as const) {
			expect(maintenanceRequestSchema.safeParse({ ...valid, urgency }).success).toBe(true);
		}
	});
});

describe("expenseSchema", () => {
	const valid = {
		amount: 250.0,
		date: "2025-03-15",
		category: "Maintenance/Repair" as const,
		payee: "Bob's Plumbing",
		notes: "",
	};

	it("accepts a valid expense", () => {
		expect(expenseSchema.safeParse(valid).success).toBe(true);
	});

	it("rejects zero amount", () => {
		expect(expenseSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
	});

	it("rejects negative amount", () => {
		expect(expenseSchema.safeParse({ ...valid, amount: -50 }).success).toBe(false);
	});

	it("rejects an invalid category", () => {
		expect(expenseSchema.safeParse({ ...valid, category: "Food" }).success).toBe(false);
	});

	it("rejects an invalid date format", () => {
		expect(expenseSchema.safeParse({ ...valid, date: "March 15 2025" }).success).toBe(false);
	});

	it("accepts the minimum valid amount", () => {
		expect(expenseSchema.safeParse({ ...valid, amount: 0.01 }).success).toBe(true);
	});
});

describe("messageSchema", () => {
	it("accepts a valid message", () => {
		expect(messageSchema.safeParse({ body: "Hello!" }).success).toBe(true);
	});

	it("rejects an empty body", () => {
		expect(messageSchema.safeParse({ body: "" }).success).toBe(false);
	});

	it("accepts a message with a maintenanceRequestId", () => {
		expect(
			messageSchema.safeParse({
				body: "The leak is fixed.",
				maintenanceRequestId: "550e8400-e29b-41d4-a716-446655440000",
			}).success,
		).toBe(true);
	});

	it("rejects an invalid maintenanceRequestId format", () => {
		expect(
			messageSchema.safeParse({ body: "Hello", maintenanceRequestId: "not-a-uuid" }).success,
		).toBe(false);
	});
});
