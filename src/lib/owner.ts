import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { owners } from "@/lib/db/schema";
import type { Owner } from "@/types";

export async function getOrCreateOwner(
	userId: string,
	email: string,
	name: string,
): Promise<Owner> {
	const existing = await db.query.owners.findFirst({
		where: eq(owners.userId, userId),
	});
	if (existing) return existing;

	const [created] = await db.insert(owners).values({ userId, email, name }).returning();
	return created;
}
