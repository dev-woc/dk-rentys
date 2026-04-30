import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { tenants, vehicles } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { vehicleSchema } from "@/lib/validations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	const { id: tenantId } = await params;

	const tenant = await db.query.tenants.findFirst({
		where: and(eq(tenants.id, tenantId), eq(tenants.ownerId, resolved.owner.id)),
	});
	if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const rows = await db.query.vehicles.findMany({
		where: eq(vehicles.tenantId, tenantId),
	});

	return NextResponse.json({ vehicles: rows });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	const { id: tenantId } = await params;

	const tenant = await db.query.tenants.findFirst({
		where: and(eq(tenants.id, tenantId), eq(tenants.ownerId, resolved.owner.id)),
	});
	if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const body = await request.json();
	const result = vehicleSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [vehicle] = await db
		.insert(vehicles)
		.values({
			tenantId,
			make: result.data.make,
			model: result.data.model,
			year: result.data.year,
			color: result.data.color,
			plateNumber: result.data.plateNumber,
			plateState: result.data.plateState,
			parkingSpot: result.data.parkingSpot,
			isAuthorized: result.data.isAuthorized,
		})
		.returning();

	return NextResponse.json({ vehicle }, { status: 201 });
}
