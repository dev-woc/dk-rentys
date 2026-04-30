"use client";

import Link from "next/link";
import { useState } from "react";
import { LeaseBadge } from "@/components/tenants/lease-badge";
import { TenantForm } from "@/components/tenants/tenant-form";
import { Button } from "@/components/ui/button";
import type { Unit, UnitWithTenants } from "@/types";
import { UnitForm } from "./unit-form";

interface UnitListProps {
	propertyId: string;
	units: UnitWithTenants[];
	onMutate: () => void;
}

export function UnitList({ propertyId, units, onMutate }: UnitListProps) {
	const [editUnit, setEditUnit] = useState<Unit | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [addTenantUnitId, setAddTenantUnitId] = useState<string | null>(null);
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
					{units.map((unit) => {
						const currentTenant = unit.tenants?.find((t) => t.moveOutDate === null);
						const activeLease = unit.leases?.find((l) => l.status !== "expired");
						return (
							<div key={unit.id} className="flex items-center justify-between px-4 py-3">
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<span className="font-medium">
											{unit.unitNumber ? `Unit ${unit.unitNumber}` : "Unit"}
										</span>
										<span className="text-sm text-muted-foreground">
											{unit.bedrooms}bd / {unit.bathrooms}ba
											{unit.sqft ? ` · ${unit.sqft} sqft` : ""}
										</span>
										{activeLease && <LeaseBadge lease={activeLease} />}
									</div>
									{currentTenant ? (
										<Link
											href={`/tenants/${currentTenant.id}`}
											className="text-sm text-muted-foreground hover:underline"
										>
											{currentTenant.fullName}
										</Link>
									) : (
										<button
											type="button"
											className="text-sm text-muted-foreground hover:text-foreground hover:underline"
											onClick={() => setAddTenantUnitId(unit.id)}
										>
											Vacant — Add Tenant
										</button>
									)}
								</div>
								<div className="flex gap-2 shrink-0">
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
						);
					})}
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

			{addTenantUnitId && (
				<TenantForm
					open={!!addTenantUnitId}
					onOpenChange={(open) => !open && setAddTenantUnitId(null)}
					defaultUnitId={addTenantUnitId}
					onSuccess={() => {
						setAddTenantUnitId(null);
						onMutate();
					}}
				/>
			)}
		</div>
	);
}
