import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { tenantSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const rows = await db.query.tenants.findMany({
		where: eq(tenants.ownerId, resolved.owner.id),
		with: { unit: { with: { property: true } }, leases: true },
		orderBy: (t, { asc }) => [asc(t.fullName)],
	});

	return NextResponse.json({ tenants: rows });
}

export async function POST(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const body = await request.json();
	const result = tenantSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [tenant] = await db
		.insert(tenants)
		.values({
			ownerId: resolved.owner.id,
			unitId: body.unitId ?? null,
			fullName: result.data.fullName,
			phone: result.data.phone,
			email: result.data.email,
			moveInDate: result.data.moveInDate ?? null,
			notes: result.data.notes,
			emergencyContactName: body.emergencyContactName ?? "",
			emergencyContactRelationship: body.emergencyContactRelationship ?? "",
			emergencyContactPhone: body.emergencyContactPhone ?? "",
			emergencyContactEmail: body.emergencyContactEmail ?? "",
			dateOfBirth: body.dateOfBirth ?? null,
		})
		.returning();

	return NextResponse.json({ tenant }, { status: 201 });
}
