import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { units } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { unitSchema } from "@/lib/validations";

async function resolveUnit(
	request: NextRequest,
	unitId: string,
): Promise<
	| { unit: typeof units.$inferSelect & { property: { ownerId: string } }; owner: { id: string } }
	| { error: string; status: number }
> {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return { error: "Too many requests", status: 429 };

	const { data } = await auth.getSession();
	if (!data?.user) return { error: "Unauthorized", status: 401 };

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");

	const unit = await db.query.units.findFirst({
		where: eq(units.id, unitId),
		with: { property: true },
	});

	if (!unit || unit.property.ownerId !== owner.id) return { error: "Not found", status: 404 };

	return { unit, owner };
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; unitId: string }> },
) {
	const { unitId } = await params;
	const resolved = await resolveUnit(request, unitId);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const body = await request.json();
	const result = unitSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [updated] = await db
		.update(units)
		.set({
			unitNumber: result.data.unitNumber,
			bedrooms: result.data.bedrooms,
			bathrooms: result.data.bathrooms,
			sqft: result.data.sqft ?? null,
			updatedAt: new Date(),
		})
		.where(eq(units.id, unitId))
		.returning();

	return NextResponse.json({ unit: updated });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; unitId: string }> },
) {
	const { unitId } = await params;
	const resolved = await resolveUnit(request, unitId);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	await db.delete(units).where(eq(units.id, unitId));

	return NextResponse.json({ success: true });
}
