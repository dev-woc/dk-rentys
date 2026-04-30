import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { tenantSchema } from "@/lib/validations";

async function resolveOwner(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return { error: "Too many requests", status: 429 } as const;

	const { data } = await auth.getSession();
	if (!data?.user) return { error: "Unauthorized", status: 401 } as const;

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
	return { owner } as const;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const resolved = await resolveOwner(request);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const { id } = await params;
	const tenant = await db.query.tenants.findFirst({
		where: and(eq(tenants.id, id), eq(tenants.ownerId, resolved.owner.id)),
		with: { vehicles: true, leases: true, unit: { with: { property: true } } },
	});

	if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json({ tenant });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const resolved = await resolveOwner(request);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const { id } = await params;

	const existing = await db.query.tenants.findFirst({
		where: and(eq(tenants.id, id), eq(tenants.ownerId, resolved.owner.id)),
	});
	if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const body = await request.json();
	const result = tenantSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [updated] = await db
		.update(tenants)
		.set({
			unitId: body.unitId ?? null,
			fullName: result.data.fullName,
			phone: result.data.phone,
			email: result.data.email,
			moveInDate: result.data.moveInDate ?? null,
			moveOutDate: body.moveOutDate ?? null,
			notes: result.data.notes,
			emergencyContactName: body.emergencyContactName ?? "",
			emergencyContactRelationship: body.emergencyContactRelationship ?? "",
			emergencyContactPhone: body.emergencyContactPhone ?? "",
			emergencyContactEmail: body.emergencyContactEmail ?? "",
			dateOfBirth: body.dateOfBirth ?? null,
			updatedAt: new Date(),
		})
		.where(eq(tenants.id, id))
		.returning();

	return NextResponse.json({ tenant: updated });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const resolved = await resolveOwner(request);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const { id } = await params;

	const [deleted] = await db
		.delete(tenants)
		.where(and(eq(tenants.id, id), eq(tenants.ownerId, resolved.owner.id)))
		.returning();

	if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json({ success: true });
}
