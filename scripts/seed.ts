/**
 * Seed demo data for a specific owner account.
 *
 * Usage:
 *   npx tsx scripts/seed.ts <email>
 *
 * The email must match an owner row created when the user first logged in.
 * If you haven't logged in yet, start the app, sign up, then run this script.
 */

// ── Load env ─────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

function loadEnvLocal() {
	try {
		const content = readFileSync(".env.local", "utf-8");
		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eqIdx = trimmed.indexOf("=");
			if (eqIdx === -1) continue;
			const key = trimmed.slice(0, eqIdx).trim();
			const val = trimmed.slice(eqIdx + 1).trim();
			if (!process.env[key]) process.env[key] = val;
		}
	} catch {
		// .env.local may not exist in CI — rely on environment
	}
}

loadEnvLocal();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error("ERROR: DATABASE_URL not set. Add it to .env.local or export it.");
	process.exit(1);
}

const email = process.argv[2];
if (!email) {
	console.error("Usage: npx tsx scripts/seed.ts <email>");
	process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysFromNow(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().split("T")[0];
}

function daysAgo(days: number): string {
	return daysFromNow(-days);
}

function monthsAgo(months: number): string {
	const d = new Date();
	d.setMonth(d.getMonth() - months);
	return d.toISOString().split("T")[0];
}

function monthsFromNow(months: number): string {
	const d = new Date();
	d.setMonth(d.getMonth() + months);
	return d.toISOString().split("T")[0];
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
	console.log(`\nLooking up owner for ${email}…`);

	const owner = await db.query.owners.findFirst({
		where: eq(schema.owners.email, email),
	});

	if (!owner) {
		console.error(
			`No owner found for email "${email}".\n` +
				"Make sure you have signed up and logged in to the app at least once, then try again.",
		);
		process.exit(1);
	}

	console.log(`Found owner: ${owner.name || "(no name)"} (id: ${owner.id})\n`);

	// ── Properties ──────────────────────────────────────────────────────────
	console.log("Creating properties…");

	const [maple] = await db
		.insert(schema.properties)
		.values({
			ownerId: owner.id,
			address: "1420 Maple Street",
			city: "Austin",
			state: "TX",
			zip: "78701",
			propertyType: "single_family",
			purchaseDate: "2021-03-15",
			mortgagePayment: "1450.00",
			notes: "Original purchase — great neighborhood, low vacancy history.",
		})
		.returning();

	const [riverside] = await db
		.insert(schema.properties)
		.values({
			ownerId: owner.id,
			address: "3318 Riverside Drive",
			city: "Austin",
			state: "TX",
			zip: "78704",
			propertyType: "multi_unit",
			purchaseDate: "2022-08-01",
			mortgagePayment: "2980.00",
			notes: "3-unit building. Unit 103 needs some cosmetic work before re-listing.",
		})
		.returning();

	const [cedar] = await db
		.insert(schema.properties)
		.values({
			ownerId: owner.id,
			address: "815 Cedar Oak Lane",
			city: "Austin",
			state: "TX",
			zip: "78745",
			propertyType: "condo",
			purchaseDate: "2023-01-20",
			mortgagePayment: "1820.00",
		})
		.returning();

	console.log(`  ✓ ${maple.address}`);
	console.log(`  ✓ ${riverside.address}`);
	console.log(`  ✓ ${cedar.address}`);

	// ── Units ────────────────────────────────────────────────────────────────
	console.log("Creating units…");

	const [mapleUnit1] = await db
		.insert(schema.units)
		.values({ propertyId: maple.id, unitNumber: "1", bedrooms: 2, bathrooms: 1, sqft: 950 })
		.returning();

	const [mapleUnit2] = await db
		.insert(schema.units)
		.values({ propertyId: maple.id, unitNumber: "2", bedrooms: 1, bathrooms: 1, sqft: 700 })
		.returning();

	const [rv101] = await db
		.insert(schema.units)
		.values({ propertyId: riverside.id, unitNumber: "101", bedrooms: 2, bathrooms: 2, sqft: 1100 })
		.returning();

	const [rv102] = await db
		.insert(schema.units)
		.values({ propertyId: riverside.id, unitNumber: "102", bedrooms: 1, bathrooms: 1, sqft: 750 })
		.returning();

	const [rv103] = await db
		.insert(schema.units)
		.values({ propertyId: riverside.id, unitNumber: "103", bedrooms: 1, bathrooms: 1, sqft: 620 })
		.returning();

	const [cedarUnit] = await db
		.insert(schema.units)
		.values({ propertyId: cedar.id, unitNumber: "", bedrooms: 3, bathrooms: 2, sqft: 1400 })
		.returning();

	console.log("  ✓ 6 units across 3 properties");

	// ── Vendors ──────────────────────────────────────────────────────────────
	console.log("Creating vendors…");

	const [vendorPlumbing] = await db
		.insert(schema.vendors)
		.values({
			ownerId: owner.id,
			name: "Austin Plumbing Co",
			trade: "Plumber",
			phone: "(512) 555-0192",
			email: "dispatch@austinplumbing.example",
			typicalRate: "$95/hr + parts",
			notes: "Fast response. Always cleans up after. Ask for Mike.",
			rating: 5,
			isPreferred: true,
		})
		.returning();

	const [vendorHvac] = await db
		.insert(schema.vendors)
		.values({
			ownerId: owner.id,
			name: "Lone Star HVAC",
			trade: "HVAC",
			phone: "(512) 555-0247",
			email: "service@lonestar-hvac.example",
			typicalRate: "$120/hr",
			notes: "Great for emergency calls. A/C tune-ups every spring.",
			rating: 5,
			isPreferred: true,
		})
		.returning();

	const [vendorHandyman] = await db
		.insert(schema.vendors)
		.values({
			ownerId: owner.id,
			name: "Fix-It-All Handyman",
			trade: "Handyman",
			phone: "(512) 555-0318",
			email: "",
			typicalRate: "$65/hr",
			notes: "Good for small jobs — appliances, doors, fixtures.",
			rating: 4,
			isPreferred: false,
		})
		.returning();

	console.log("  ✓ 3 vendors");

	// ── Tenants ──────────────────────────────────────────────────────────────
	console.log("Creating tenants…");

	const [marcus] = await db
		.insert(schema.tenants)
		.values({
			ownerId: owner.id,
			unitId: mapleUnit1.id,
			fullName: "Marcus Johnson",
			phone: "(512) 555-0101",
			email: "marcus.johnson@example.com",
			moveInDate: "2023-06-01",
			dateOfBirth: "1988-04-12",
			emergencyContactName: "Linda Johnson",
			emergencyContactRelationship: "Mother",
			emergencyContactPhone: "(512) 555-0102",
			emergencyContactEmail: "linda.johnson@example.com",
			notes: "Long-term tenant. Always pays on time. Prefers text over calls.",
		})
		.returning();

	const [sarah] = await db
		.insert(schema.tenants)
		.values({
			ownerId: owner.id,
			unitId: rv101.id,
			fullName: "Sarah Chen",
			phone: "(512) 555-0203",
			email: "sarah.chen@example.com",
			moveInDate: "2024-01-01",
			dateOfBirth: "1995-09-22",
			emergencyContactName: "Wei Chen",
			emergencyContactRelationship: "Father",
			emergencyContactPhone: "(512) 555-0204",
			emergencyContactEmail: "",
			notes: "Works from home. Very tidy. Has a cat (authorized).",
		})
		.returning();

	const [david] = await db
		.insert(schema.tenants)
		.values({
			ownerId: owner.id,
			unitId: rv102.id,
			fullName: "David Park",
			phone: "(512) 555-0305",
			email: "dpark@example.com",
			moveInDate: "2023-03-15",
			dateOfBirth: "1991-11-08",
			emergencyContactName: "James Park",
			emergencyContactRelationship: "Brother",
			emergencyContactPhone: "(512) 555-0306",
			emergencyContactEmail: "",
			notes: "Month-to-month. Has been late twice before — send reminder on the 28th.",
		})
		.returning();

	const [priya] = await db
		.insert(schema.tenants)
		.values({
			ownerId: owner.id,
			unitId: cedarUnit.id,
			fullName: "Priya Patel",
			phone: "(512) 555-0407",
			email: "priya.patel@example.com",
			moveInDate: "2024-03-01",
			dateOfBirth: "1993-07-15",
			emergencyContactName: "Raj Patel",
			emergencyContactRelationship: "Spouse",
			emergencyContactPhone: "(512) 555-0408",
			emergencyContactEmail: "raj.patel@example.com",
			notes: "Interested in renewing. Has mentioned possibly wanting a 2-year lease.",
		})
		.returning();

	console.log("  ✓ 4 tenants (Unit 2 at Maple and Unit 103 at Riverside are vacant)");

	// ── Vehicles ─────────────────────────────────────────────────────────────
	console.log("Creating vehicles…");

	await db.insert(schema.vehicles).values({
		tenantId: marcus.id,
		make: "Ford",
		model: "F-150",
		year: 2019,
		color: "Blue",
		plateNumber: "HJK4821",
		plateState: "TX",
		parkingSpot: "1A",
		isAuthorized: true,
	});

	await db.insert(schema.vehicles).values({
		tenantId: sarah.id,
		make: "Honda",
		model: "Civic",
		year: 2022,
		color: "White",
		plateNumber: "LMN9034",
		plateState: "TX",
		parkingSpot: "101",
		isAuthorized: true,
	});

	await db.insert(schema.vehicles).values({
		tenantId: sarah.id,
		make: "Toyota",
		model: "Prius",
		year: 2018,
		color: "Silver",
		plateNumber: "XYZ5512",
		plateState: "TX",
		parkingSpot: "101B",
		isAuthorized: true,
	});

	console.log("  ✓ 3 vehicles");

	// ── Leases ───────────────────────────────────────────────────────────────
	console.log("Creating leases…");

	const [marcusLease] = await db
		.insert(schema.leases)
		.values({
			unitId: mapleUnit1.id,
			tenantId: marcus.id,
			startDate: "2023-06-01",
			endDate: monthsFromNow(8),
			monthlyRent: "1800.00",
			securityDeposit: "1800.00",
			status: "active",
			lateFeePolicy: "$75 after 5-day grace period",
		})
		.returning();

	const [sarahLease] = await db
		.insert(schema.leases)
		.values({
			unitId: rv101.id,
			tenantId: sarah.id,
			startDate: "2024-01-01",
			endDate: monthsFromNow(9),
			monthlyRent: "1400.00",
			securityDeposit: "1400.00",
			status: "active",
			lateFeePolicy: "$50 after 5-day grace period",
		})
		.returning();

	const [davidLease] = await db
		.insert(schema.leases)
		.values({
			unitId: rv102.id,
			tenantId: david.id,
			startDate: "2023-03-15",
			endDate: daysAgo(5),
			monthlyRent: "1100.00",
			securityDeposit: "1100.00",
			status: "month_to_month",
			lateFeePolicy: "$50 after 3-day grace period",
		})
		.returning();

	const [priyaLease] = await db
		.insert(schema.leases)
		.values({
			unitId: cedarUnit.id,
			tenantId: priya.id,
			startDate: "2024-03-01",
			endDate: daysFromNow(42),
			monthlyRent: "2200.00",
			securityDeposit: "2200.00",
			status: "active",
			lateFeePolicy: "$100 after 5-day grace period",
			renewalStatus: "in_progress",
		})
		.returning();

	console.log("  ✓ 4 leases (Priya expiring in ~42 days, David on month-to-month)");

	// ── Payments ─────────────────────────────────────────────────────────────
	console.log("Creating payments…");

	// Marcus — 3 paid + 1 pending this month
	for (let i = 3; i >= 1; i--) {
		const dueDate = monthsAgo(i).slice(0, 7) + "-01";
		await db.insert(schema.payments).values({
			tenantId: marcus.id,
			unitId: mapleUnit1.id,
			amount: "1800.00",
			dueDate,
			paidDate: dueDate,
			method: "zelle",
			status: "paid",
			lateFeeAmount: "0",
			notes: "",
		});
	}
	await db.insert(schema.payments).values({
		tenantId: marcus.id,
		unitId: mapleUnit1.id,
		amount: "1800.00",
		dueDate: new Date().toISOString().slice(0, 7) + "-01",
		paidDate: null,
		method: null,
		status: "pending",
		lateFeeAmount: "0",
		notes: "Sent reminder on the 28th.",
	});

	// Sarah — 4 paid
	for (let i = 4; i >= 1; i--) {
		const dueDate = monthsAgo(i).slice(0, 7) + "-01";
		await db.insert(schema.payments).values({
			tenantId: sarah.id,
			unitId: rv101.id,
			amount: "1400.00",
			dueDate,
			paidDate: dueDate,
			method: "ach",
			status: "paid",
			lateFeeAmount: "0",
			notes: "",
		});
	}

	// David — 1 paid, 1 late
	await db.insert(schema.payments).values({
		tenantId: david.id,
		unitId: rv102.id,
		amount: "1100.00",
		dueDate: monthsAgo(1).slice(0, 7) + "-01",
		paidDate: monthsAgo(1).slice(0, 7) + "-04",
		method: "cash",
		status: "paid",
		lateFeeAmount: "0",
		notes: "",
	});
	await db.insert(schema.payments).values({
		tenantId: david.id,
		unitId: rv102.id,
		amount: "1100.00",
		dueDate: new Date().toISOString().slice(0, 7) + "-01",
		paidDate: null,
		method: null,
		status: "late",
		lateFeeAmount: "50.00",
		notes: "Called on the 8th, no response. Left voicemail.",
	});

	// Priya — 3 paid + 1 pending
	for (let i = 3; i >= 1; i--) {
		const dueDate = monthsAgo(i).slice(0, 7) + "-01";
		await db.insert(schema.payments).values({
			tenantId: priya.id,
			unitId: cedarUnit.id,
			amount: "2200.00",
			dueDate,
			paidDate: dueDate,
			method: "check",
			status: "paid",
			lateFeeAmount: "0",
			notes: "",
		});
	}
	await db.insert(schema.payments).values({
		tenantId: priya.id,
		unitId: cedarUnit.id,
		amount: "2200.00",
		dueDate: new Date().toISOString().slice(0, 7) + "-01",
		paidDate: null,
		method: null,
		status: "pending",
		lateFeeAmount: "0",
		notes: "",
	});

	console.log("  ✓ 12 payments (mix of paid, pending, and 1 late)");

	// ── Maintenance Requests ──────────────────────────────────────────────────
	console.log("Creating maintenance requests…");

	// Marcus's unit — HVAC urgent, in_progress with vendor assigned
	await db.insert(schema.maintenanceRequests).values({
		unitId: mapleUnit1.id,
		tenantId: marcus.id,
		vendorId: vendorHvac.id,
		category: "HVAC",
		urgency: "Urgent",
		description:
			"AC unit blowing warm air. Tenant reports it started two days ago. Outside unit fan appears to be spinning but compressor may not be engaging.",
		status: "in_progress",
		scheduledDate: daysFromNow(2),
		budget: "350.00",
		cost: null,
	});

	// Riverside 103 (vacant) — Plumbing, Routine
	await db.insert(schema.maintenanceRequests).values({
		unitId: rv103.id,
		tenantId: null,
		vendorId: null,
		category: "Plumbing",
		urgency: "Routine",
		description:
			"Slow drain in bathroom sink. Noticed during walkthrough after previous tenant moved out. Needs snaking or possible trap replacement.",
		status: "received",
		scheduledDate: null,
		budget: "150.00",
		cost: null,
	});

	// David's unit — Appliance, Routine, scheduled
	await db.insert(schema.maintenanceRequests).values({
		unitId: rv102.id,
		tenantId: david.id,
		vendorId: vendorHandyman.id,
		category: "Appliance",
		urgency: "Routine",
		description:
			"Dishwasher not draining after cycle completes. Standing water at the bottom. Tenant has been hand-washing dishes in the meantime.",
		status: "scheduled",
		scheduledDate: daysFromNow(5),
		budget: "120.00",
		cost: null,
	});

	// Priya's unit — Plumbing, resolved (historical)
	await db.insert(schema.maintenanceRequests).values({
		unitId: cedarUnit.id,
		tenantId: priya.id,
		vendorId: vendorPlumbing.id,
		category: "Plumbing",
		urgency: "Emergency",
		description:
			"Hot water heater leak — water pooling in utility closet. Tenant discovered Saturday morning.",
		status: "resolved",
		scheduledDate: daysAgo(30),
		budget: "800.00",
		cost: "645.00",
		resolvedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
	});

	console.log("  ✓ 4 maintenance requests (1 urgent in-progress, 2 open, 1 resolved)");

	// ── Summary ───────────────────────────────────────────────────────────────
	console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Demo data seeded for ${email}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Properties:   3
  Units:        6 (4 occupied, 2 vacant)
  Tenants:      4
  Vehicles:     3
  Leases:       4 (1 expiring soon, 1 month-to-month)
  Payments:     12 (paid/pending/late mix)
  Maintenance:  4 (1 urgent, 2 open, 1 resolved)
  Vendors:      3

  Open app → http://localhost:3000/dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
