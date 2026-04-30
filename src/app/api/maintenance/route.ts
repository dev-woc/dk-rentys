import { eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { maintenanceRequests, properties, units } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { maintenanceRequestSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
	const ownerProperties = await db.query.properties.findMany({
		where: eq(properties.ownerId, owner.id),
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

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
	const body = await request.json();

	if (!body.unitId) return NextResponse.json({ error: "unitId is required" }, { status: 400 });

	const unit = await db.query.units.findFirst({
		where: eq(units.id, body.unitId),
		with: { property: true },
	});
	if (!unit || unit.property.ownerId !== owner.id) {
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
			status: "received",
		})
		.returning();

	return NextResponse.json({ request: created }, { status: 201 });
}
