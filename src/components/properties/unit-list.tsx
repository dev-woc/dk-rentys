"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Unit } from "@/types";
import { UnitForm } from "./unit-form";

interface UnitListProps {
	propertyId: string;
	units: Unit[];
	onMutate: () => void;
}

export function UnitList({ propertyId, units, onMutate }: UnitListProps) {
	const [editUnit, setEditUnit] = useState<Unit | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	async function handleDelete(unitId: string) {
		setDeletingId(unitId);
		try {
			await fetch(`/api/properties/${propertyId}/units/${unitId}`, { method: "DELETE" });
			onMutate();
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Units</h2>
				<Button size="sm" onClick={() => setAddOpen(true)}>
					Add Unit
				</Button>
			</div>

			{units.length === 0 ? (
				<p className="text-sm text-muted-foreground">No units added yet.</p>
			) : (
				<div className="divide-y rounded-lg border">
					{units.map((unit) => (
						<div key={unit.id} className="flex items-center justify-between px-4 py-3">
							<div>
								<span className="font-medium">
									{unit.unitNumber ? `Unit ${unit.unitNumber}` : "Unit"}
								</span>
								<span className="ml-2 text-sm text-muted-foreground">
									{unit.bedrooms}bd / {unit.bathrooms}ba
									{unit.sqft ? ` · ${unit.sqft} sqft` : ""}
								</span>
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="outline" onClick={() => setEditUnit(unit)}>
									Edit
								</Button>
								<Button
									size="sm"
									variant="destructive"
									disabled={deletingId === unit.id}
									onClick={() => handleDelete(unit.id)}
								>
									{deletingId === unit.id ? "…" : "Delete"}
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<UnitForm
				open={addOpen}
				onOpenChange={setAddOpen}
				propertyId={propertyId}
				onSuccess={onMutate}
			/>

			{editUnit && (
				<UnitForm
					open={!!editUnit}
					onOpenChange={(open) => !open && setEditUnit(null)}
					propertyId={propertyId}
					unit={editUnit}
					onSuccess={() => {
						setEditUnit(null);
						onMutate();
					}}
				/>
			)}
		</div>
	);
}
