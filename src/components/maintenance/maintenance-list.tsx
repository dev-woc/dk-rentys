"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type {
	MaintenanceRequestWithDetails,
	MaintenanceStatus,
	MaintenanceUrgency,
	Vendor,
} from "@/types";
import { MaintenanceForm } from "./maintenance-form";
import { StatusBadge } from "./status-badge";
import { UrgencyBadge } from "./urgency-badge";

interface UnitOption {
	id: string;
	label: string;
}

interface MaintenanceListProps {
	requests: MaintenanceRequestWithDetails[];
	onMutate: () => void;
	unitId?: string;
	tenantId?: string;
	unitOptions?: UnitOption[];
	vendors?: Vendor[];
}

export function MaintenanceList({
	requests,
	onMutate,
	unitId,
	tenantId,
	unitOptions = [],
	vendors = [],
}: MaintenanceListProps) {
	const [editRequest, setEditRequest] = useState<MaintenanceRequestWithDetails | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	async function handleDelete(requestId: string) {
		setDeletingId(requestId);
		try {
			await fetch(`/api/maintenance/${requestId}`, { method: "DELETE" });
			onMutate();
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold">Maintenance</h3>
				<Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
					Add Request
				</Button>
			</div>

			{requests.length === 0 ? (
				<p className="text-sm text-muted-foreground">No maintenance requests yet.</p>
			) : (
				<div className="divide-y rounded-lg border">
					{requests.map((request) => (
						<div key={request.id} className="flex items-center justify-between gap-4 px-4 py-3">
							<div className="space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<UrgencyBadge urgency={request.urgency as MaintenanceUrgency} />
									<StatusBadge status={request.status as MaintenanceStatus} />
									<span className="font-medium">{request.category}</span>
								</div>
								<p className="text-sm text-muted-foreground">
									{request.description.length > 80
										? `${request.description.slice(0, 80)}…`
										: request.description}
								</p>
								<p className="text-sm text-muted-foreground">
									{request.unit.property.address}
									{request.unit.unitNumber ? ` — Unit ${request.unit.unitNumber}` : ""}
									{request.tenant ? ` · ${request.tenant.fullName}` : ""}
								</p>
								<p className="text-sm text-muted-foreground">
									Opened {new Date(request.createdAt).toLocaleDateString()}
									{request.resolvedAt
										? ` · Resolved ${new Date(request.resolvedAt).toLocaleDateString()}`
										: ""}
								</p>
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="outline" onClick={() => setEditRequest(request)}>
									Edit
								</Button>
								<Button
									size="sm"
									variant="destructive"
									disabled={deletingId === request.id}
									onClick={() => handleDelete(request.id)}
								>
									{deletingId === request.id ? "…" : "Delete"}
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<MaintenanceForm
				open={addOpen}
				onOpenChange={setAddOpen}
				unitId={unitId}
				tenantId={tenantId}
				unitOptions={unitOptions}
				vendors={vendors}
				onSuccess={onMutate}
			/>

			{editRequest && (
				<MaintenanceForm
					open={!!editRequest}
					onOpenChange={(open) => !open && setEditRequest(null)}
					unitId={editRequest.unitId}
					tenantId={editRequest.tenantId ?? undefined}
					request={editRequest}
					vendors={vendors}
					onSuccess={() => {
						setEditRequest(null);
						onMutate();
					}}
				/>
			)}
		</div>
	);
}
