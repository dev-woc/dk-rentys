"use client";

import { useCallback, useEffect, useState } from "react";
import { PropertyCard } from "@/components/properties/property-card";
import { PropertyForm } from "@/components/properties/property-form";
import { Button } from "@/components/ui/button";
import type { PropertyWithUnits } from "@/types";

export function PropertiesClient() {
	const [properties, setProperties] = useState<PropertyWithUnits[]>([]);
	const [loading, setLoading] = useState(true);
	const [addOpen, setAddOpen] = useState(false);

	const fetchProperties = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/properties");
			if (res.ok) {
				const json = await res.json();
				setProperties(json.properties ?? []);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchProperties();
	}, [fetchProperties]);

	return (
		<div className="p-8 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Properties</h1>
					<p className="text-muted-foreground mt-1">Manage your rental portfolio</p>
				</div>
				<Button onClick={() => setAddOpen(true)}>Add Property</Button>
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : properties.length === 0 ? (
				<div className="rounded-lg border border-dashed p-12 text-center">
					<p className="text-muted-foreground">No properties yet.</p>
					<Button className="mt-4" onClick={() => setAddOpen(true)}>
						Add Your First Property
					</Button>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{properties.map((property) => (
						<PropertyCard key={property.id} property={property} />
					))}
				</div>
			)}

			<PropertyForm open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchProperties} />
		</div>
	);
}
