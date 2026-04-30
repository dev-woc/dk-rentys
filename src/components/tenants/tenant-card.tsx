import Link from "next/link";
import { getLeaseStatus, LeaseBadge } from "@/components/tenants/lease-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TenantWithDetails } from "@/types";

interface TenantCardProps {
	tenant: TenantWithDetails;
}

export function TenantCard({ tenant }: TenantCardProps) {
	const activeLease = tenant.leases.find((l) => l.status !== "expired");
	const unitLabel = tenant.unit
		? `${tenant.unit.property.address}${tenant.unit.unitNumber ? ` — Unit ${tenant.unit.unitNumber}` : ""}`
		: null;

	return (
		<Link href={`/tenants/${tenant.id}`}>
			<Card className="hover:shadow-md transition-shadow cursor-pointer">
				<CardHeader className="pb-2">
					<div className="flex items-start justify-between gap-2">
						<CardTitle className="text-base">{tenant.fullName}</CardTitle>
						{activeLease && <LeaseBadge lease={activeLease} />}
					</div>
					{unitLabel && <p className="text-sm text-muted-foreground">{unitLabel}</p>}
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground space-y-0.5">
					{tenant.phone && <p>{tenant.phone}</p>}
					{tenant.email && <p>{tenant.email}</p>}
					{tenant.moveInDate && <p>Moved in {new Date(tenant.moveInDate).toLocaleDateString()}</p>}
				</CardContent>
			</Card>
		</Link>
	);
}
