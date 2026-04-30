import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { propertySchema } from "@/lib/validations";

async function resolveOwner(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return { error: "Too many requests", status: 429 } as const;

	const resolved = await requireOwner();
	if ("error" in resolved) return resolved;
	return { owner: resolved.owner } as const;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const resolved = await resolveOwner(request);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const { id } = await params;
	const property = await db.query.properties.findFirst({
		where: and(eq(properties.id, id), eq(properties.ownerId, resolved.owner.id)),
		with: { units: { with: { tenants: true, leases: true } } },
	});

	if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json({ property });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const resolved = await resolveOwner(request);
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const { id } = await params;

	const existing = await db.query.properties.findFirst({
		where: and(eq(properties.id, id), eq(properties.ownerId, resolved.owner.id)),
	});
	if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const body = await request.json();
	const result = propertySchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [updated] = await db
		.update(properties)
		.set({
			address: result.data.address,
			city: result.data.city,
			state: result.data.state,
			zip: result.data.zip,
			propertyType: result.data.propertyType,
			purchaseDate: result.data.purchaseDate ?? null,
			mortgagePayment: result.data.mortgagePayment?.toString() ?? null,
			notes: result.data.notes,
			updatedAt: new Date(),
		})
		.where(eq(properties.id, id))
		.returning();

	return NextResponse.json({ property: updated });
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
		.delete(properties)
		.where(and(eq(properties.id, id), eq(properties.ownerId, resolved.owner.id)))
		.returning();

	if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json({ success: true });
}
