import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { maintenanceRequests, tenants } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { maintenanceRequestSchema } from "@/lib/validations";

export async function GET(request: Request) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireTenant();
	if ("error" in resolved) {
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	}

	const tenant = await db.query.tenants.findFirst({
		where: eq(tenants.id, resolved.tenant.id),
		with: { unit: { with: { property: true } } },
	});
	if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const requests = await db.query.maintenanceRequests.findMany({
		where: eq(maintenanceRequests.tenantId, tenant.id),
		with: {
			unit: { with: { property: true } },
			vendor: true,
			tenant: true,
		},
		orderBy: (requestRow, { desc }) => [desc(requestRow.createdAt)],
	});

	return NextResponse.json({ requests, tenant });
}

export async function POST(request: Request) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireTenant();
	if ("error" in resolved) {
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	}

	const tenant = await db.query.tenants.findFirst({
		where: eq(tenants.id, resolved.tenant.id),
	});
	if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
	if (!tenant.unitId) {
		return NextResponse.json(
			{ error: "Your account is not assigned to a unit yet." },
			{ status: 400 },
		);
	}

	const body = await request.json();
	const result = maintenanceRequestSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [created] = await db
		.insert(maintenanceRequests)
		.values({
			unitId: tenant.unitId,
			tenantId: tenant.id,
			vendorId: null,
			category: result.data.category,
			urgency: result.data.urgency,
			description: result.data.description,
			budget: result.data.budget?.toString() ?? null,
			photos: result.data.photos,
			status: "received",
		})
		.returning();

	return NextResponse.json({ request: created }, { status: 201 });
}
