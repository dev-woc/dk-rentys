import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";
import { propertySchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const rows = await db.query.properties.findMany({
		where: eq(properties.ownerId, resolved.owner.id),
		with: { units: true },
		orderBy: (p, { asc }) => [asc(p.address)],
	});

	return NextResponse.json({ properties: rows });
}

export async function POST(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireOwner();
	if ("error" in resolved)
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });

	const body = await request.json();
	const result = propertySchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [property] = await db
		.insert(properties)
		.values({
			ownerId: resolved.owner.id,
			address: result.data.address,
			city: result.data.city,
			state: result.data.state,
			zip: result.data.zip,
			propertyType: result.data.propertyType,
			purchaseDate: result.data.purchaseDate ?? null,
			mortgagePayment: result.data.mortgagePayment?.toString() ?? null,
			notes: result.data.notes,
		})
		.returning();

	return NextResponse.json({ property }, { status: 201 });
}
