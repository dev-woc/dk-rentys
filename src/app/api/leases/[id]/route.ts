import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { leases } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { leaseSchema } from "@/lib/validations";

async function resolveLease(request: NextRequest, leaseId: string) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return { error: "Too many requests", status: 429 };

	const resolved = await requireOwner();
	if ("error" in resolved) return resolved;

	const lease = await db.query.leases.findFirst({
		where: eq(leases.id, leaseId),
		with: { unit: { with: { property: true } } },
	});

	if (!lease || lease.unit.property.ownerId !== resolved.owner.id)
		return { error: "Not found", status: 404 };

	return { lease, owner: resolved.owner };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const resolved = await resolveLease(request, id);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const body = await request.json();
	const result = leaseSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [updated] = await db
		.update(leases)
		.set({
			startDate: result.data.startDate,
			endDate: result.data.endDate,
			monthlyRent: result.data.monthlyRent.toString(),
			securityDeposit: result.data.securityDeposit.toString(),
			lateFeePolicy: result.data.lateFeePolicy,
			renewalStatus: result.data.renewalStatus ?? null,
			status: body.status ?? "active",
			updatedAt: new Date(),
		})
		.where(eq(leases.id, id))
		.returning();

	return NextResponse.json({ lease: updated });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const resolved = await resolveLease(request, id);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	await db.delete(leases).where(eq(leases.id, id));

	return NextResponse.json({ success: true });
}
