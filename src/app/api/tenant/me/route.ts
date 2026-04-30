import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { apiRateLimiter } from "@/lib/rate-limit";

export async function GET(request: Request) {
	const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
	const { success } = apiRateLimiter.check(ip);
	if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const resolved = await requireTenant();
	if ("error" in resolved) {
		return NextResponse.json({ error: resolved.error }, { status: resolved.status });
	}

	const tenant = await db.query.tenants.findFirst({
		where: eq(tenants.id, resolved.tenant.id),
		with: {
			unit: { with: { property: true } },
			leases: true,
			payments: true,
			maintenanceRequests: {
				with: {
					unit: { with: { property: true } },
					vendor: true,
					tenant: true,
				},
			},
		},
	});

	if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

	return NextResponse.json({ tenant });
}
