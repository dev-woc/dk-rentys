import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { payments, tenants } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { paymentSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");

	const ownerTenants = await db.query.tenants.findMany({
		where: eq(tenants.ownerId, owner.id),
		columns: { id: true },
	});
	const tenantIds = ownerTenants.map((tenant) => tenant.id);

	if (tenantIds.length === 0) {
		return NextResponse.json({ payments: [] });
	}

	const ownerPayments = await db.query.payments.findMany({
		where: inArray(payments.tenantId, tenantIds),
		with: { tenant: true, unit: { with: { property: true } } },
		orderBy: (payment, { desc }) => [desc(payment.dueDate)],
	});

	return NextResponse.json({ payments: ownerPayments });
}

export async function POST(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
	const body = await request.json();

	if (!body.tenantId) return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
	if (!body.unitId) return NextResponse.json({ error: "unitId is required" }, { status: 400 });

	const tenant = await db.query.tenants.findFirst({
		where: and(eq(tenants.id, body.tenantId), eq(tenants.ownerId, owner.id)),
	});
	if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const result = paymentSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [payment] = await db
		.insert(payments)
		.values({
			tenantId: body.tenantId,
			unitId: body.unitId,
			amount: result.data.amount.toString(),
			dueDate: result.data.dueDate,
			method: result.data.method ?? null,
			notes: result.data.notes,
			lateFeeAmount: "0",
			status: "pending",
		})
		.returning();

	return NextResponse.json({ payment }, { status: 201 });
}
