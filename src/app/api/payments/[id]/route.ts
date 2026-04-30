import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { paymentSchema } from "@/lib/validations";

async function resolvePayment(request: NextRequest, paymentId: string) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return { error: "Too many requests", status: 429 } as const;

	const { data } = await auth.getSession();
	if (!data?.user) return { error: "Unauthorized", status: 401 } as const;

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
	const payment = await db.query.payments.findFirst({
		where: eq(payments.id, paymentId),
		with: { tenant: true },
	});

	if (!payment || payment.tenant.ownerId !== owner.id) {
		return { error: "Not found", status: 404 } as const;
	}

	return { payment, owner } as const;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const resolved = await resolvePayment(request, id);
	if ("error" in resolved) {
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	}

	const body = await request.json();
	const result = paymentSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [updated] = await db
		.update(payments)
		.set({
			amount: result.data.amount.toString(),
			dueDate: result.data.dueDate,
			method: result.data.method ?? null,
			notes: result.data.notes,
			status: body.status ?? resolved.payment.status,
			paidDate: body.paidDate ?? null,
			lateFeeAmount: Number(body.lateFeeAmount ?? 0).toString(),
			updatedAt: new Date(),
		})
		.where(eq(payments.id, id))
		.returning();

	return NextResponse.json({ payment: updated });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const resolved = await resolvePayment(request, id);
	if ("error" in resolved) {
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	}

	await db.delete(payments).where(eq(payments.id, id));

	return NextResponse.json({ success: true });
}
