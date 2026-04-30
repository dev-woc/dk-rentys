"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Vehicle } from "@/types";
import { VehicleForm } from "./vehicle-form";

interface VehicleListProps {
	tenantId: string;
	vehicles: Vehicle[];
	onMutate: () => void;
}

export function VehicleList({ tenantId, vehicles, onMutate }: VehicleListProps) {
	const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	async function handleDelete(vehicleId: string) {
		setDeletingId(vehicleId);
		try {
			await fetch(`/api/tenants/${tenantId}/vehicles/${vehicleId}`, { method: "DELETE" });
			onMutate();
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold">Vehicles</h3>
				<Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
					Add Vehicle
				</Button>
			</div>

			{vehicles.length === 0 ? (
				<p className="text-sm text-muted-foreground">No vehicles on record.</p>
			) : (
				<div className="divide-y rounded-lg border">
					{vehicles.map((v) => (
						<div key={v.id} className="flex items-center justify-between px-4 py-3">
							<div>
								<span className="font-medium">
									{v.year} {v.color} {v.make} {v.model}
								</span>
								<span className="ml-2 text-sm text-muted-foreground">
									{v.plateState} · {v.plateNumber}
									{v.parkingSpot ? ` · Spot ${v.parkingSpot}` : ""}
								</span>
								{!v.isAuthorized && (
									<Badge variant="destructive" className="ml-2 text-xs">
										Unauthorized
									</Badge>
								)}
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="outline" onClick={() => setEditVehicle(v)}>
									Edit
								</Button>
								<Button
									size="sm"
									variant="destructive"
									disabled={deletingId === v.id}
									onClick={() => handleDelete(v.id)}
								>
									{deletingId === v.id ? "…" : "Delete"}
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<VehicleForm
				open={addOpen}
				onOpenChange={setAddOpen}
				tenantId={tenantId}
				onSuccess={onMutate}
			/>

			{editVehicle && (
				<VehicleForm
					open={!!editVehicle}
					onOpenChange={(open) => !open && setEditVehicle(null)}
					tenantId={tenantId}
					vehicle={editVehicle}
					onSuccess={() => {
						setEditVehicle(null);
						onMutate();
					}}
				/>
			)}
		</div>
	);
}
