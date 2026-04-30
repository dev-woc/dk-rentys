import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { vendorSchema } from "@/lib/validations";

async function resolveVendor(request: NextRequest, vendorId: string) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return { error: "Too many requests", status: 429 } as const;

	const { data } = await auth.getSession();
	if (!data?.user) return { error: "Unauthorized", status: 401 } as const;

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
	const vendor = await db.query.vendors.findFirst({
		where: and(eq(vendors.id, vendorId), eq(vendors.ownerId, owner.id)),
	});

	if (!vendor) return { error: "Not found", status: 404 } as const;
	return { vendor, owner } as const;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const resolved = await resolveVendor(request, id);
	if ("error" in resolved) {
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	}

	const body = await request.json();
	const result = vendorSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [updated] = await db
		.update(vendors)
		.set({
			name: result.data.name,
			trade: result.data.trade,
			phone: result.data.phone,
			email: result.data.email,
			typicalRate: result.data.typicalRate,
			notes: result.data.notes,
			isPreferred: body.isPreferred ?? false,
			rating: body.rating ?? null,
			updatedAt: new Date(),
		})
		.where(eq(vendors.id, id))
		.returning();

	return NextResponse.json({ vendor: updated });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const resolved = await resolveVendor(request, id);
	if ("error" in resolved) {
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	}

	await db.delete(vendors).where(eq(vendors.id, id));

	return NextResponse.json({ success: true });
}
