"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceRequest, Vendor } from "@/types";

interface UnitOption {
	id: string;
	label: string;
}

interface MaintenanceFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	unitId?: string;
	tenantId?: string;
	request?: MaintenanceRequest;
	unitOptions?: UnitOption[];
	vendors?: Vendor[];
	onSuccess: () => void;
}

const CATEGORY_OPTIONS = [
	"Plumbing",
	"Electrical",
	"HVAC",
	"Appliance",
	"Structural",
	"Pest",
	"Other",
] as const;

const URGENCY_OPTIONS = ["Emergency", "Urgent", "Routine"] as const;
const STATUS_OPTIONS = [
	{ value: "received", label: "Received" },
	{ value: "assigned", label: "Assigned" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "scheduled", label: "Scheduled" },
	{ value: "resolved", label: "Resolved" },
] as const;

export function MaintenanceForm({
	open,
	onOpenChange,
	unitId,
	tenantId,
	request,
	unitOptions = [],
	vendors = [],
	onSuccess,
}: MaintenanceFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [selectedUnitId, setSelectedUnitId] = useState(request?.unitId ?? unitId ?? "");
	const [selectedVendorId, setSelectedVendorId] = useState(request?.vendorId ?? "");
	const [status, setStatus] = useState(request?.status ?? "received");
	const [category, setCategory] = useState(request?.category ?? "");
	const [urgency, setUrgency] = useState(request?.urgency ?? "");
	const isEdit = !!request;

	useEffect(() => {
		if (!open) return;
		setError("");
		setSelectedUnitId(request?.unitId ?? unitId ?? unitOptions[0]?.id ?? "");
		setSelectedVendorId(request?.vendorId ?? "");
		setStatus(request?.status ?? "received");
		setCategory(request?.category ?? "");
		setUrgency(request?.urgency ?? "");
	}, [open, request, unitId, unitOptions]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");

		const resolvedUnitId = request?.unitId ?? unitId ?? selectedUnitId;
		if (!resolvedUnitId) {
			setError("Select a unit first.");
			return;
		}

		setLoading(true);
		const form = e.currentTarget;
		const fd = new FormData(form);
		const body = {
			unitId: resolvedUnitId,
			tenantId: tenantId ?? null,
			category: fd.get("category") as string,
			urgency: fd.get("urgency") as string,
			description: fd.get("description") as string,
			budget: fd.get("budget") ? Number(fd.get("budget")) : null,
			status: isEdit ? ((fd.get("status") as string) || request.status) : undefined,
			scheduledDate: isEdit ? ((fd.get("scheduledDate") as string) || null) : undefined,
			cost: isEdit && fd.get("cost") ? Number(fd.get("cost")) : null,
			vendorId: isEdit ? ((fd.get("vendorId") as string) || null) : null,
		};

		try {
			const url = isEdit ? `/api/maintenance/${request.id}` : "/api/maintenance";
			const res = await fetch(url, {
				method: isEdit ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const json = await res.json();
				setError(json.error ?? "Something went wrong");
				return;
			}

			onSuccess();
			onOpenChange(false);
		} catch {
			setError("Network error");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Request" : "Add Request"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					{!isEdit && unitOptions.length > 0 && (
						<div className="space-y-1">
							<Label htmlFor="unitId">Unit</Label>
							<Select name="unitId" value={selectedUnitId} onValueChange={setSelectedUnitId}>
								<SelectTrigger id="unitId">
									<SelectValue placeholder="Select a unit" />
								</SelectTrigger>
								<SelectContent>
									{unitOptions.map((option) => (
										<SelectItem key={option.id} value={option.id}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="category">Category</Label>
							<Select name="category" value={category} onValueChange={setCategory}>
								<SelectTrigger id="category">
									<SelectValue placeholder="Select a category" />
								</SelectTrigger>
								<SelectContent>
									{CATEGORY_OPTIONS.map((option) => (
										<SelectItem key={option} value={option}>
											{option}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label htmlFor="urgency">Urgency</Label>
							<Select name="urgency" value={urgency} onValueChange={setUrgency}>
								<SelectTrigger id="urgency">
									<SelectValue placeholder="Select urgency" />
								</SelectTrigger>
								<SelectContent>
									{URGENCY_OPTIONS.map((option) => (
										<SelectItem key={option} value={option}>
											{option}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-1">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							name="description"
							required
							defaultValue={request?.description ?? ""}
							placeholder="Describe the issue"
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="budget">Budget ($)</Label>
						<Input
							id="budget"
							name="budget"
							type="number"
							min="0"
							step="0.01"
							defaultValue={request?.budget ? Number(request.budget) : ""}
							placeholder="Optional"
						/>
					</div>

					{isEdit && (
						<>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label htmlFor="status">Status</Label>
									<Select name="status" value={status} onValueChange={setStatus}>
										<SelectTrigger id="status">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{STATUS_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label htmlFor="scheduledDate">Scheduled Date</Label>
									<Input
										id="scheduledDate"
										name="scheduledDate"
										type="date"
										defaultValue={request?.scheduledDate ?? ""}
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label htmlFor="cost">Cost ($)</Label>
									<Input
										id="cost"
										name="cost"
										type="number"
										min="0"
										step="0.01"
										defaultValue={request?.cost ? Number(request.cost) : ""}
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="vendorId">Vendor</Label>
									<Select
										name="vendorId"
										value={selectedVendorId || undefined}
										onValueChange={setSelectedVendorId}
									>
										<SelectTrigger id="vendorId">
											<SelectValue placeholder="Select a vendor" />
										</SelectTrigger>
										<SelectContent>
											{vendors.map((vendor) => (
												<SelectItem key={vendor.id} value={vendor.id}>
													{vendor.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</>
					)}

					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Saving…" : isEdit ? "Save Changes" : "Add Request"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
