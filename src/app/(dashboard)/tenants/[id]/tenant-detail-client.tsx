"use client";

import { useCallback, useEffect, useState } from "react";
import { LeaseBadge } from "@/components/tenants/lease-badge";
import { LeaseForm } from "@/components/tenants/lease-form";
import { TenantForm } from "@/components/tenants/tenant-form";
import { VehicleList } from "@/components/tenants/vehicle-list";
import { Button } from "@/components/ui/button";
import type { Lease, TenantWithDetails } from "@/types";

interface TenantDetailClientProps {
	tenantId: string;
}

export function TenantDetailClient({ tenantId }: TenantDetailClientProps) {
	const [tenant, setTenant] = useState<TenantWithDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [editOpen, setEditOpen] = useState(false);
	const [leaseFormOpen, setLeaseFormOpen] = useState(false);
	const [editLease, setEditLease] = useState<Lease | null>(null);
	const [deleting, setDeleting] = useState(false);

	const fetchTenant = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/tenants/${tenantId}`);
			if (res.ok) {
				const json = await res.json();
				setTenant(json.tenant ?? null);
			}
		} finally {
			setLoading(false);
		}
	}, [tenantId]);

	useEffect(() => {
		fetchTenant();
	}, [fetchTenant]);

	async function handleDelete() {
		if (!confirm("Delete this tenant? This cannot be undone.")) return;
		setDeleting(true);
		try {
			await fetch(`/api/tenants/${tenantId}`, { method: "DELETE" });
			window.location.href = "/tenants";
		} finally {
			setDeleting(false);
		}
	}

	if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
	if (!tenant) return <div className="p-8 text-sm text-muted-foreground">Tenant not found.</div>;

	const activeLease = tenant.leases.find((l) => l.status !== "expired") ?? null;
	const unitLabel = tenant.unit
		? `${tenant.unit.property.address}${tenant.unit.unitNumber ? ` — Unit ${tenant.unit.unitNumber}` : ""}`
		: null;

	return (
		<div className="p-8 space-y-8 max-w-3xl">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">{tenant.fullName}</h1>
					{unitLabel && <p className="text-muted-foreground mt-1">{unitLabel}</p>}
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

			<div className="rounded-lg border p-4 space-y-1 text-sm">
				{tenant.phone && (
					<p>
						<span className="font-medium">Phone:</span> {tenant.phone}
					</p>
				)}
				{tenant.email && (
					<p>
						<span className="font-medium">Email:</span> {tenant.email}
					</p>
				)}
				{tenant.dateOfBirth && (
					<p>
						<span className="font-medium">DOB:</span>{" "}
						{new Date(tenant.dateOfBirth).toLocaleDateString()}
					</p>
				)}
				{tenant.moveInDate && (
					<p>
						<span className="font-medium">Move-in:</span>{" "}
						{new Date(tenant.moveInDate).toLocaleDateString()}
					</p>
				)}
			</div>

			{(tenant.emergencyContactName || tenant.emergencyContactPhone) && (
				<div className="rounded-lg border p-4 space-y-1 text-sm">
					<p className="font-medium mb-2">Emergency Contact</p>
					{tenant.emergencyContactName && (
						<p>
							{tenant.emergencyContactName}
							{tenant.emergencyContactRelationship
								? ` (${tenant.emergencyContactRelationship})`
								: ""}
						</p>
					)}
					{tenant.emergencyContactPhone && <p>{tenant.emergencyContactPhone}</p>}
					{tenant.emergencyContactEmail && <p>{tenant.emergencyContactEmail}</p>}
				</div>
			)}

			{tenant.notes && (
				<div className="rounded-lg border p-4 text-sm">
					<p className="font-medium mb-1">Notes</p>
					<p className="text-muted-foreground">{tenant.notes}</p>
				</div>
			)}

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Lease</h2>
					{activeLease ? (
						<Button size="sm" variant="outline" onClick={() => setEditLease(activeLease)}>
							Edit Lease
						</Button>
					) : tenant.unit ? (
						<Button size="sm" onClick={() => setLeaseFormOpen(true)}>
							Add Lease
						</Button>
					) : null}
				</div>

				{activeLease ? (
					<div className="rounded-lg border p-4 space-y-2 text-sm">
						<div className="flex items-center justify-between">
							<span className="font-medium">Status</span>
							<LeaseBadge lease={activeLease} />
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<span className="text-muted-foreground">Start</span>
								<p>{new Date(activeLease.startDate).toLocaleDateString()}</p>
							</div>
							<div>
								<span className="text-muted-foreground">End</span>
								<p>{new Date(activeLease.endDate).toLocaleDateString()}</p>
							</div>
							<div>
								<span className="text-muted-foreground">Monthly Rent</span>
								<p className="font-medium">${Number(activeLease.monthlyRent).toLocaleString()}</p>
							</div>
							<div>
								<span className="text-muted-foreground">Security Deposit</span>
								<p>${Number(activeLease.securityDeposit).toLocaleString()}</p>
							</div>
						</div>
						{activeLease.lateFeePolicy && (
							<p>
								<span className="text-muted-foreground">Late fee policy:</span>{" "}
								{activeLease.lateFeePolicy}
							</p>
						)}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						{tenant.unit
							? "No active lease. Add one to track rent terms."
							: "Assign tenant to a unit first to add a lease."}
					</p>
				)}
			</div>

			<VehicleList tenantId={tenant.id} vehicles={tenant.vehicles} onMutate={fetchTenant} />

			{editOpen && (
				<TenantForm
					open={editOpen}
					onOpenChange={setEditOpen}
					tenant={tenant}
					onSuccess={() => {
						setEditOpen(false);
						fetchTenant();
					}}
				/>
			)}

			{tenant.unit && (
				<>
					<LeaseForm
						open={leaseFormOpen}
						onOpenChange={setLeaseFormOpen}
						unitId={tenant.unit.id}
						tenantId={tenant.id}
						onSuccess={() => {
							setLeaseFormOpen(false);
							fetchTenant();
						}}
					/>
					{editLease && (
						<LeaseForm
							open={!!editLease}
							onOpenChange={(open) => !open && setEditLease(null)}
							unitId={tenant.unit.id}
							tenantId={tenant.id}
							lease={editLease}
							onSuccess={() => {
								setEditLease(null);
								fetchTenant();
							}}
						/>
					)}
				</>
			)}
		</div>
	);
}
