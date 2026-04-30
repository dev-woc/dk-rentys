import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { maintenanceRequests } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { maintenanceRequestSchema } from "@/lib/validations";

async function resolveMaintenance(request: NextRequest, requestId: string) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return { error: "Too many requests", status: 429 } as const;

	const { data } = await auth.getSession();
	if (!data?.user) return { error: "Unauthorized", status: 401 } as const;

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");
	const maintenanceRequest = await db.query.maintenanceRequests.findFirst({
		where: eq(maintenanceRequests.id, requestId),
		with: { unit: { with: { property: true } } },
	});

	if (!maintenanceRequest || maintenanceRequest.unit.property.ownerId !== owner.id) {
		return { error: "Not found", status: 404 } as const;
	}

	return { request: maintenanceRequest, owner } as const;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const resolved = await resolveMaintenance(request, id);
	if ("error" in resolved) {
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	}

	const fullRequest = await db.query.maintenanceRequests.findFirst({
		where: eq(maintenanceRequests.id, id),
		with: { unit: { with: { property: true } }, tenant: true, vendor: true },
	});

	return NextResponse.json({ request: fullRequest });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const resolved = await resolveMaintenance(request, id);
	if ("error" in resolved) {
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	}

	const body = await request.json();
	const result = maintenanceRequestSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const status = body.status ?? resolved.request.status;
	const [updated] = await db
		.update(maintenanceRequests)
		.set({
			category: result.data.category,
			urgency: result.data.urgency,
			description: result.data.description,
			budget: result.data.budget?.toString() ?? null,
			status,
			scheduledDate: body.scheduledDate ?? null,
			vendorId: body.vendorId ?? null,
			cost: body.cost != null ? Number(body.cost).toString() : null,
			resolvedAt: status === "resolved" ? new Date() : null,
			updatedAt: new Date(),
		})
		.where(eq(maintenanceRequests.id, id))
		.returning();

	return NextResponse.json({ request: updated });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const resolved = await resolveMaintenance(request, id);
	if ("error" in resolved) {
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	}

	await db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));

	return NextResponse.json({ success: true });
}
