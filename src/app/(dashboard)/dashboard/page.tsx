import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { owners, properties } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
	const { data } = await auth.getSession();
	if (!data?.user) redirect("/login");

	const owner = await db.query.owners.findFirst({
		where: eq(owners.userId, data.user.id),
	});

	if (!owner) {
		return (
			<div className="p-8">
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground mt-2">Add your first property to get started.</p>
				<Button asChild className="mt-4">
					<Link href="/properties">Add Property</Link>
				</Button>
			</div>
		);
	}

	const allProperties = await db.query.properties.findMany({
		where: eq(properties.ownerId, owner.id),
		with: {
			units: {
				with: { tenants: true },
			},
		},
	});

	const totalProperties = allProperties.length;
	const totalUnits = allProperties.reduce((sum, p) => sum + p.units.length, 0);
	const occupiedUnits = allProperties.reduce(
		(sum, p) => sum + p.units.filter((u) => u.tenants.some((t) => t.moveOutDate === null)).length,
		0,
	);
	const vacantUnits = totalUnits - occupiedUnits;
	const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

	return (
		<div className="p-8 space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground mt-1">Your portfolio at a glance</p>
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<StatCard label="Properties" value={totalProperties} />
				<StatCard label="Total Units" value={totalUnits} />
				<StatCard label="Occupied" value={occupiedUnits} subtitle={`${occupancyRate}% occupancy`} />
				<StatCard label="Vacant" value={vacantUnits} />
			</div>

			{totalProperties === 0 && (
				<div className="rounded-lg border border-dashed p-12 text-center">
					<p className="text-muted-foreground">No properties yet.</p>
					<Button asChild className="mt-4">
						<Link href="/properties">Add Your First Property</Link>
					</Button>
				</div>
			)}
		</div>
	);
}
