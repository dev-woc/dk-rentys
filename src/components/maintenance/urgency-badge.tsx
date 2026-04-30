import { Badge } from "@/components/ui/badge";
import type { MaintenanceUrgency } from "@/types";

const URGENCY_VARIANTS: Record<
	MaintenanceUrgency,
	"default" | "secondary" | "destructive" | "outline"
> = {
	Emergency: "destructive",
	Urgent: "outline",
	Routine: "secondary",
};

export function UrgencyBadge({ urgency }: { urgency: MaintenanceUrgency }) {
	return <Badge variant={URGENCY_VARIANTS[urgency]}>{urgency}</Badge>;
}
