import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { vehicleSchema } from "@/lib/validations";

async function resolveVehicle(request: NextRequest, vehicleId: string) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return { error: "Too many requests", status: 429 };

	const resolved = await requireOwner();
	if ("error" in resolved) return resolved;

	const vehicle = await db.query.vehicles.findFirst({
		where: eq(vehicles.id, vehicleId),
		with: { tenant: true },
	});

	if (!vehicle || vehicle.tenant.ownerId !== resolved.owner.id)
		return { error: "Not found", status: 404 };

	return { vehicle, owner: resolved.owner };
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ vehicleId: string }> },
) {
	const { vehicleId } = await params;
	const resolved = await resolveVehicle(request, vehicleId);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const body = await request.json();
	const result = vehicleSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [updated] = await db
		.update(vehicles)
		.set({
			make: result.data.make,
			model: result.data.model,
			year: result.data.year,
			color: result.data.color,
			plateNumber: result.data.plateNumber,
			plateState: result.data.plateState,
			parkingSpot: result.data.parkingSpot,
			isAuthorized: result.data.isAuthorized,
			updatedAt: new Date(),
		})
		.where(eq(vehicles.id, vehicleId))
		.returning();

	return NextResponse.json({ vehicle: updated });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ vehicleId: string }> },
) {
	const { vehicleId } = await params;
	const resolved = await resolveVehicle(request, vehicleId);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	await db.delete(vehicles).where(eq(vehicles.id, vehicleId));

	return NextResponse.json({ success: true });
}
