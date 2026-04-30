import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { leases, units } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { leaseSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");

	const body = await request.json();

	if (!body.unitId) return NextResponse.json({ error: "unitId is required" }, { status: 400 });
	if (!body.tenantId) return NextResponse.json({ error: "tenantId is required" }, { status: 400 });

	const unit = await db.query.units.findFirst({
		where: eq(units.id, body.unitId),
		with: { property: true },
	});
	if (!unit || unit.property.ownerId !== owner.id)
		return NextResponse.json({ error: "Not found" }, { status: 404 });

	const result = leaseSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [lease] = await db
		.insert(leases)
		.values({
			unitId: body.unitId,
			tenantId: body.tenantId,
			startDate: result.data.startDate,
			endDate: result.data.endDate,
			monthlyRent: result.data.monthlyRent.toString(),
			securityDeposit: result.data.securityDeposit.toString(),
			lateFeePolicy: result.data.lateFeePolicy,
			renewalStatus: result.data.renewalStatus ?? null,
			status: "active",
		})
		.returning();

	return NextResponse.json({ lease }, { status: 201 });
}
