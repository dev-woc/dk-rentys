import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/types";

const STATUS_LABELS: Record<PaymentStatus, string> = {
	pending: "Due",
	paid: "Paid",
	late: "Late",
	partial: "Partial",
	failed: "Failed",
};

const STATUS_VARIANTS: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> =
	{
		pending: "secondary",
		paid: "default",
		late: "destructive",
		partial: "outline",
		failed: "destructive",
	};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
	return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
