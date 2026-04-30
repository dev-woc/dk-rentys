import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { properties, units } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { unitSchema } from "@/lib/validations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const { id: propertyId } = await params;

	const property = await db.query.properties.findFirst({
		where: and(eq(properties.id, propertyId), eq(properties.ownerId, resolved.owner.id)),
	});
	if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const rows = await db.query.units.findMany({
		where: eq(units.propertyId, propertyId),
		orderBy: (u, { asc }) => [asc(u.unitNumber)],
	});

	return NextResponse.json({ units: rows });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const { id: propertyId } = await params;

	const property = await db.query.properties.findFirst({
		where: and(eq(properties.id, propertyId), eq(properties.ownerId, resolved.owner.id)),
	});
	if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const body = await request.json();
	const result = unitSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [unit] = await db
		.insert(units)
		.values({
			propertyId: property.id,
			unitNumber: result.data.unitNumber,
			bedrooms: result.data.bedrooms,
			bathrooms: result.data.bathrooms,
			sqft: result.data.sqft ?? null,
		})
		.returning();

	return NextResponse.json({ unit }, { status: 201 });
}
