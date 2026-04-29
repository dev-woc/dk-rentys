import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { propertySchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");

	const rows = await db.query.properties.findMany({
		where: eq(properties.ownerId, owner.id),
		with: { units: true },
		orderBy: (p, { asc }) => [asc(p.address)],
	});

	return NextResponse.json({ properties: rows });
}

export async function POST(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");

	const body = await request.json();
	const result = propertySchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [property] = await db
		.insert(properties)
		.values({
			ownerId: owner.id,
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
