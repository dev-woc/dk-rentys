import { eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { maintenanceRequests, properties, units } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { maintenanceRequestSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	const ownerProperties = await db.query.properties.findMany({
		where: eq(properties.ownerId, resolved.owner.id),
		with: { units: { columns: { id: true } } },
	});
	const unitIds = ownerProperties.flatMap((property) => property.units.map((unit) => unit.id));

	if (unitIds.length === 0) {
		return NextResponse.json({ requests: [] });
	}

	const requests = await db.query.maintenanceRequests.findMany({
		where: inArray(maintenanceRequests.unitId, unitIds),
		with: { unit: { with: { property: true } }, tenant: true, vendor: true },
		orderBy: (request, { desc }) => [desc(request.createdAt)],
	});

	return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	const body = await request.json();

	if (!body.unitId) return NextResponse.json({ error: "unitId is required" }, { status: 400 });

	const unit = await db.query.units.findFirst({
		where: eq(units.id, body.unitId),
		with: { property: true },
	});
	if (!unit || unit.property.ownerId !== resolved.owner.id) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const result = maintenanceRequestSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [created] = await db
		.insert(maintenanceRequests)
		.values({
			unitId: body.unitId,
			tenantId: body.tenantId ?? null,
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
