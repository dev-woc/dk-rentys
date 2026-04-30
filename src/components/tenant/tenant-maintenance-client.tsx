"use client";

import { useCallback, useEffect, useState } from "react";
import { MaintenanceForm } from "@/components/maintenance/maintenance-form";
import { StatusBadge } from "@/components/maintenance/status-badge";
import { UrgencyBadge } from "@/components/maintenance/urgency-badge";
import { Button } from "@/components/ui/button";
import type {
	MaintenanceRequestWithDetails,
	MaintenanceStatus,
	MaintenanceUrgency,
	TenantPortalProfile,
} from "@/types";

export function TenantMaintenanceClient() {
	const [tenant, setTenant] = useState<TenantPortalProfile | null>(null);
	const [requests, setRequests] = useState<MaintenanceRequestWithDetails[]>([]);
	const [loading, setLoading] = useState(true);
	const [addOpen, setAddOpen] = useState(false);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const [meRes, requestsRes] = await Promise.all([
				fetch("/api/tenant/me"),
				fetch("/api/tenant/maintenance"),
			]);

			if (meRes.ok) {
				const json = await meRes.json();
				setTenant(json.tenant ?? null);
			}

			if (requestsRes.ok) {
				const json = await requestsRes.json();
				setRequests(json.requests ?? []);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
	if (!tenant) return <div className="p-8 text-sm text-muted-foreground">Tenant account not found.</div>;

	return (
		<div className="mx-auto max-w-4xl space-y-6 p-8">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">Maintenance Requests</h1>
					<p className="mt-1 text-muted-foreground">
						Report issues for your unit and track repair progress.
					</p>
				</div>
				<Button onClick={() => setAddOpen(true)} disabled={!tenant.unit}>
					New Request
				</Button>
			</div>

			{requests.length === 0 ? (
				<div className="rounded-lg border border-dashed p-12 text-center">
					<p className="text-muted-foreground">No maintenance requests submitted yet.</p>
				</div>
			) : (
				<div className="divide-y rounded-lg border">
					{requests.map((request) => (
						<div key={request.id} className="space-y-2 px-4 py-4">
							<div className="flex flex-wrap items-center gap-2">
								<UrgencyBadge urgency={request.urgency as MaintenanceUrgency} />
								<StatusBadge status={request.status as MaintenanceStatus} />
								<span className="font-medium">{request.category}</span>
							</div>
							<p className="text-sm text-muted-foreground">{request.description}</p>
							<p className="text-sm text-muted-foreground">
								Submitted {new Date(request.createdAt).toLocaleDateString()}
								{request.vendor ? ` · Vendor: ${request.vendor.name}` : ""}
								{request.scheduledDate
									? ` · Scheduled ${new Date(request.scheduledDate).toLocaleDateString()}`
									: ""}
							</p>
						</div>
					))}
				</div>
			)}

			{tenant.unit && (
				<MaintenanceForm
					open={addOpen}
					onOpenChange={setAddOpen}
					unitId={tenant.unit.id}
					tenantId={tenant.id}
					onSuccess={fetchData}
				/>
			)}
		</div>
	);
}
