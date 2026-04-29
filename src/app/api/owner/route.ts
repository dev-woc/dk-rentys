import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { owners } from "@/lib/db/schema";
import { getOrCreateOwner } from "@/lib/owner";
import { apiRateLimiter } from "@/lib/rate-limit";
import { ownerSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const owner = await getOrCreateOwner(data.user.id, data.user.email ?? "", data.user.name ?? "");

	return NextResponse.json({ owner });
}

export async function PUT(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const { data } = await auth.getSession();
	if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const body = await request.json();
	const result = ownerSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
	}

	const [updated] = await db
		.update(owners)
		.set({ name: result.data.name, phone: result.data.phone, updatedAt: new Date() })
		.where(eq(owners.userId, data.user.id))
		.returning();

	if (!updated) return NextResponse.json({ error: "Owner not found" }, { status: 404 });

	return NextResponse.json({ owner: updated });
}
