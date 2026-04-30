import { Badge } from "@/components/ui/badge";
import type { Lease, LeaseStatus } from "@/types";

export function getLeaseStatus(lease: Lease): LeaseStatus {
	if (lease.status === "month_to_month") return "month_to_month";
	const today = new Date();
	const end = new Date(lease.endDate);
	const daysUntilEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
	if (daysUntilEnd < 0) return "expired";
	if (daysUntilEnd <= 60) return "expiring_soon";
	return "active";
}

const STATUS_LABELS: Record<LeaseStatus, string> = {
	active: "Active",
	expiring_soon: "Expiring Soon",
	month_to_month: "Month-to-Month",
	expired: "Expired",
};

const STATUS_VARIANTS: Record<LeaseStatus, "default" | "secondary" | "destructive" | "outline"> = {
	active: "default",
	expiring_soon: "outline",
	month_to_month: "secondary",
	expired: "destructive",
};

interface LeaseBadgeProps {
	lease: Lease;
}

export function LeaseBadge({ lease }: LeaseBadgeProps) {
	const status = getLeaseStatus(lease);
	return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
