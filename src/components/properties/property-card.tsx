import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PropertyWithUnits } from "@/types";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
	single_family: "Single Family",
	multi_family: "Multi Family",
	condo: "Condo",
	townhouse: "Townhouse",
	commercial: "Commercial",
	other: "Other",
};

interface PropertyCardProps {
	property: PropertyWithUnits;
}

export function PropertyCard({ property }: PropertyCardProps) {
	const occupiedCount = property.units.filter((u) =>
		u.tenants?.some((t) => t.moveOutDate === null),
	).length;
	const totalUnits = property.units.length;

	return (
		<Link href={`/properties/${property.id}`}>
			<Card className="hover:shadow-md transition-shadow cursor-pointer">
				<CardHeader className="pb-2">
					<div className="flex items-start justify-between gap-2">
						<CardTitle className="text-base leading-snug">{property.address}</CardTitle>
						<Badge variant="secondary" className="shrink-0">
							{PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">
						{property.city}, {property.state} {property.zip}
					</p>
				</CardHeader>
				<CardContent>
					<p className="text-sm">
						{totalUnits === 0 ? "No units" : `${occupiedCount} / ${totalUnits} occupied`}
					</p>
				</CardContent>
			</Card>
		</Link>
	);
}
