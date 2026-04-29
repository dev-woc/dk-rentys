import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
	label: string;
	value: string | number;
	subtitle?: string;
}

export function StatCard({ label, value, subtitle }: StatCardProps) {
	return (
		<Card>
			<CardContent className="pt-6">
				<div className="text-3xl font-bold">{value}</div>
				<div className="text-sm font-medium mt-1">{label}</div>
				{subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
			</CardContent>
		</Card>
	);
}
