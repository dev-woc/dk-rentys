import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { vendorSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	const rows = await db.query.vendors.findMany({
		where: eq(vendors.ownerId, resolved.owner.id),
		orderBy: (vendor, { asc }) => [asc(vendor.name)],
	});

	return NextResponse.json({ vendors: rows });
}

export async function POST(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	const body = await request.json();
	const result = vendorSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [vendor] = await db
		.insert(vendors)
		.values({
			ownerId: resolved.owner.id,
			name: result.data.name,
			trade: result.data.trade,
			phone: result.data.phone,
			email: result.data.email,
			typicalRate: result.data.typicalRate,
			notes: result.data.notes,
			isPreferred: result.data.isPreferred,
			rating: body.rating ?? null,
		})
		.returning();

	return NextResponse.json({ vendor }, { status: 201 });
}
