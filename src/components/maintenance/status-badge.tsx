import { Badge } from "@/components/ui/badge";
import type { MaintenanceStatus } from "@/types";

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
	received: "Received",
	assigned: "Assigned",
	in_progress: "In Progress",
	scheduled: "Scheduled",
	resolved: "Resolved",
};

const STATUS_VARIANTS: Record<
	MaintenanceStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	received: "secondary",
	assigned: "secondary",
	in_progress: "secondary",
	scheduled: "secondary",
	resolved: "default",
};

export function StatusBadge({ status }: { status: MaintenanceStatus }) {
	return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
