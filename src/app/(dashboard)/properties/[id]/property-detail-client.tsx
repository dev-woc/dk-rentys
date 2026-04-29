"use client";

import { useCallback, useEffect, useState } from "react";
import { PropertyForm } from "@/components/properties/property-form";
import { UnitList } from "@/components/properties/unit-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PropertyWithUnits } from "@/types";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
	single_family: "Single Family",
	multi_unit: "Multi Unit",
	condo: "Condo",
	townhouse: "Townhouse",
};

interface PropertyDetailClientProps {
	propertyId: string;
}

export function PropertyDetailClient({ propertyId }: PropertyDetailClientProps) {
	const [property, setProperty] = useState<PropertyWithUnits | null>(null);
	const [loading, setLoading] = useState(true);
	const [editOpen, setEditOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const fetchProperty = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/properties/${propertyId}`);
			if (res.ok) {
				const json = await res.json();
				setProperty(json.property ?? null);
			}
		} finally {
			setLoading(false);
		}
	}, [propertyId]);

	useEffect(() => {
		fetchProperty();
	}, [fetchProperty]);

	async function handleDelete() {
		if (!confirm("Delete this property and all its units? This cannot be undone.")) return;
		setDeleting(true);
		try {
			await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
			window.location.href = "/properties";
		} finally {
			setDeleting(false);
		}
	}

	if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
	if (!property)
		return <div className="p-8 text-sm text-muted-foreground">Property not found.</div>;

	const occupiedCount = property.units.filter((u) =>
		u.tenants?.some((t) => t.moveOutDate === null),
	).length;

	return (
		<div className="p-8 space-y-8 max-w-3xl">
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<h1 className="text-2xl font-bold">{property.address}</h1>
						<Badge variant="secondary">
							{PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}
						</Badge>
					</div>
					<p className="text-muted-foreground">
						{property.city}, {property.state} {property.zip}
					</p>
					<p className="text-sm mt-1">
						{property.units.length} unit{property.units.length !== 1 ? "s" : ""} · {occupiedCount}{" "}
						occupied
					</p>
				</div>
				<div className="flex gap-2 shrink-0">
					<Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
						Edit
					</Button>
					<Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
						{deleting ? "Deleting…" : "Delete"}
					</Button>
				</div>
			</div>

			{(property.mortgagePayment || property.purchaseDate || property.notes) && (
				<div className="rounded-lg border p-4 space-y-1 text-sm">
					{property.mortgagePayment && (
						<p>
							<span className="font-medium">Mortgage:</span> $
							{Number(property.mortgagePayment).toLocaleString()}/mo
						</p>
					)}
					{property.purchaseDate && (
						<p>
							<span className="font-medium">Purchased:</span>{" "}
							{new Date(property.purchaseDate).toLocaleDateString()}
						</p>
					)}
					{property.notes && (
						<p>
							<span className="font-medium">Notes:</span> {property.notes}
						</p>
					)}
				</div>
			)}

			<UnitList propertyId={property.id} units={property.units} onMutate={fetchProperty} />

			{editOpen && (
				<PropertyForm
					open={editOpen}
					onOpenChange={setEditOpen}
					property={property}
					onSuccess={() => {
						setEditOpen(false);
						fetchProperty();
					}}
				/>
			)}
		</div>
	);
}
