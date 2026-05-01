import { and, eq, inArray, lte } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { LeaseBadge } from "@/components/tenants/lease-badge";
import { Button } from "@/components/ui/button";
import { getSessionPrincipal, requireOwner } from "@/lib/auth/principal";
import { db } from "@/lib/db";
import {
	leases,
	maintenanceRequests,
	owners,
	payments,
	properties,
	tenants,
	units,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
	const principal = await getSessionPrincipal();
	if ("error" in principal) redirect("/login");
	if (principal.tenant && !principal.owner) redirect("/tenant");

	const resolved = await requireOwner();
	if ("error" in resolved) redirect("/login");
	const { owner } = resolved;

	const existingOwner = await db.query.owners.findFirst({
		where: eq(owners.userId, owner.userId),
	});

	if (!existingOwner) {
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
		with: { units: { with: { tenants: true } } },
	});

	const totalProperties = allProperties.length;
	const totalUnits = allProperties.reduce((sum, p) => sum + p.units.length, 0);
	const occupiedUnits = allProperties.reduce(
		(sum, p) => sum + p.units.filter((u) => u.tenants.some((t) => t.moveOutDate === null)).length,
		0,
	);
	const vacantUnits = totalUnits - occupiedUnits;
	const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
	const today = new Date().toISOString().split("T")[0];
	const ownerUnits = allProperties.flatMap((property) => property.units);
	const unitIds = ownerUnits.map((unit) => unit.id);

	const ownerTenants = await db.query.tenants.findMany({
		where: eq(tenants.ownerId, owner.id),
		columns: { id: true },
	});
	const tenantIds = ownerTenants.map((tenant) => tenant.id);

	const ownerPayments =
		tenantIds.length > 0
			? await db.query.payments.findMany({
					where: inArray(payments.tenantId, tenantIds),
					columns: { dueDate: true, status: true },
				})
			: [];

	const overduePayments = ownerPayments.filter(
		(payment) =>
			payment.status === "late" || (payment.status === "pending" && payment.dueDate < today),
	).length;

	const ownerMaintenanceRequests =
		unitIds.length > 0
			? await db.query.maintenanceRequests.findMany({
					where: inArray(maintenanceRequests.unitId, unitIds),
					columns: { status: true },
				})
			: [];

	const openIssues = ownerMaintenanceRequests.filter(
		(request) => request.status !== "resolved",
	).length;

	const in60Days = new Date();
	in60Days.setDate(in60Days.getDate() + 60);

	const expiringLeases = await db.query.leases.findMany({
		where: and(
			eq(leases.status, "active"),
			lte(leases.endDate, in60Days.toISOString().split("T")[0]),
		),
		with: { unit: { with: { property: true } }, tenant: true },
		orderBy: (l, { asc }) => [asc(l.endDate)],
	});

	const ownerExpiringLeases = expiringLeases.filter((l) => l.unit.property.ownerId === owner.id);

	return (
		<div className="p-8 space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground mt-1">Your portfolio at a glance</p>
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
				<StatCard label="Properties" value={totalProperties} />
				<StatCard label="Total Units" value={totalUnits} />
				<StatCard label="Occupied" value={occupiedUnits} subtitle={`${occupancyRate}% occupancy`} />
				<StatCard label="Vacant" value={vacantUnits} />
				<StatCard label="Overdue" value={overduePayments} />
				<StatCard label="Open Issues" value={openIssues} />
			</div>

			<div className="rounded-lg border p-4">
				<div className="flex items-center justify-between gap-4">
					<div>
						<h2 className="text-lg font-semibold">Maintenance Requests</h2>
						<p className="text-sm text-muted-foreground">
							Review open issues and create new repair requests.
						</p>
					</div>
					<Button asChild>
						<Link href="/maintenance">Open Maintenance</Link>
					</Button>
				</div>
			</div>

			{totalProperties === 0 && (
				<div className="rounded-lg border border-dashed p-12 text-center">
					<p className="text-muted-foreground">No properties yet.</p>
					<Button asChild className="mt-4">
						<Link href="/properties">Add Your First Property</Link>
					</Button>
				</div>
			)}

			{ownerExpiringLeases.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-lg font-semibold">Leases Expiring Soon</h2>
					<div className="divide-y rounded-lg border">
						{ownerExpiringLeases.map((lease) => {
							const daysLeft = Math.ceil(
								(new Date(lease.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
							);
							return (
								<div key={lease.id} className="flex items-center justify-between px-4 py-3">
									<div>
										<Link
											href={`/tenants/${lease.tenantId}`}
											className="font-medium hover:underline"
										>
											{lease.tenant.fullName}
										</Link>
										<p className="text-sm text-muted-foreground">
											{lease.unit.property.address}
											{lease.unit.unitNumber ? ` — Unit ${lease.unit.unitNumber}` : ""}
										</p>
									</div>
									<div className="flex items-center gap-3 shrink-0">
										<span className="text-sm text-muted-foreground">
											{daysLeft <= 0 ? "Today" : `${daysLeft}d left`}
										</span>
										<LeaseBadge lease={lease} />
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
