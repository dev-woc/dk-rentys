import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { owners, tenants } from "@/lib/db/schema";
import type { Owner, Tenant } from "@/types";

type AuthUser = NonNullable<Awaited<ReturnType<typeof auth.getSession>>["data"]>["user"];

type AuthError = { error: string; status: number };

interface SessionPrincipal {
	user: AuthUser;
	owner: Owner | null;
	tenant: Tenant | null;
}

export async function getSessionPrincipal(): Promise<SessionPrincipal | AuthError> {
	const { data } = await auth.getSession();
	if (!data?.user) {
		return { error: "Unauthorized", status: 401 };
	}

	const owner = await db.query.owners.findFirst({
		where: eq(owners.userId, data.user.id),
	});

	let tenant = await db.query.tenants.findFirst({
		where: eq(tenants.authUserId, data.user.id),
	});

	if (!tenant && data.user.email) {
		tenant = await db.query.tenants.findFirst({
			where: eq(tenants.email, data.user.email),
		});

		if (tenant && tenant.authUserId !== data.user.id) {
			const [linkedTenant] = await db
				.update(tenants)
				.set({ authUserId: data.user.id, updatedAt: new Date() })
				.where(eq(tenants.id, tenant.id))
				.returning();

			tenant = linkedTenant;
		}
	}

	return { user: data.user, owner: owner ?? null, tenant: tenant ?? null };
}

export async function requireOwner({
	createIfMissing = true,
}: {
	createIfMissing?: boolean;
} = {}): Promise<{ owner: Owner; user: AuthUser } | AuthError> {
	const principal = await getSessionPrincipal();
	if ("error" in principal) return principal;

	if (principal.tenant && !principal.owner) {
		return { error: "Forbidden", status: 403 };
	}

	let owner = principal.owner;
	if (!owner) {
		if (!createIfMissing) {
			return { error: "Owner not found", status: 404 };
		}

		const [created] = await db
			.insert(owners)
			.values({
				userId: principal.user.id,
				email: principal.user.email ?? "",
				name: principal.user.name ?? "",
			})
			.returning();

		owner = created;
	}

	return { owner, user: principal.user };
}

export async function requireTenant(): Promise<{ tenant: Tenant; user: AuthUser } | AuthError> {
	const principal = await getSessionPrincipal();
	if ("error" in principal) return principal;
	if (!principal.tenant) {
		return { error: "Forbidden", status: 403 };
	}

	return { tenant: principal.tenant, user: principal.user };
}
