import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { tenants, vehicles } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { vehicleSchema } from "@/lib/validations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
	const { id: tenantId } = await params;

	const tenant = await db.query.tenants.findFirst({
		where: and(eq(tenants.id, tenantId), eq(tenants.ownerId, owner.id)),
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

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
	const { id: tenantId } = await params;

	const tenant = await db.query.tenants.findFirst({
		where: and(eq(tenants.id, tenantId), eq(tenants.ownerId, owner.id)),
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
