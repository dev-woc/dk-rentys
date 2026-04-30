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
import type { Tenant } from "@/types";

interface UnitOption {
	id: string;
	label: string;
}

interface TenantFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tenant?: Tenant;
	defaultUnitId?: string;
	onSuccess: () => void;
}

export function TenantForm({
	open,
	onOpenChange,
	tenant,
	defaultUnitId,
	onSuccess,
}: TenantFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
	const isEdit = !!tenant;

	useEffect(() => {
		if (!open) return;
		fetch("/api/properties")
			.then((r) => r.json())
			.then((json) => {
				const options: UnitOption[] = [];
				for (const prop of json.properties ?? []) {
					for (const unit of prop.units ?? []) {
						const label = `${prop.address}${unit.unitNumber ? ` — Unit ${unit.unitNumber}` : ""}`;
						options.push({ id: unit.id, label });
					}
				}
				setUnitOptions(options);
			});
	}, [open]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const form = e.currentTarget;
		const fd = new FormData(form);

		const body = {
			fullName: fd.get("fullName") as string,
			phone: (fd.get("phone") as string) || "",
			email: (fd.get("email") as string) || "",
			dateOfBirth: (fd.get("dateOfBirth") as string) || null,
			moveInDate: (fd.get("moveInDate") as string) || null,
			unitId: (fd.get("unitId") as string) || null,
			notes: (fd.get("notes") as string) || "",
			emergencyContactName: (fd.get("emergencyContactName") as string) || "",
			emergencyContactRelationship: (fd.get("emergencyContactRelationship") as string) || "",
			emergencyContactPhone: (fd.get("emergencyContactPhone") as string) || "",
			emergencyContactEmail: (fd.get("emergencyContactEmail") as string) || "",
		};

		try {
			const url = isEdit ? `/api/tenants/${tenant.id}` : "/api/tenants";
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
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Tenant" : "Add Tenant"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="fullName">Full Name</Label>
						<Input
							id="fullName"
							name="fullName"
							required
							defaultValue={tenant?.fullName ?? ""}
							placeholder="Jane Smith"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="phone">Phone</Label>
							<Input
								id="phone"
								name="phone"
								type="tel"
								defaultValue={tenant?.phone ?? ""}
								placeholder="(555) 000-0000"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								defaultValue={tenant?.email ?? ""}
								placeholder="jane@example.com"
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="moveInDate">Move-In Date</Label>
							<Input
								id="moveInDate"
								name="moveInDate"
								type="date"
								defaultValue={tenant?.moveInDate ?? ""}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="dateOfBirth">Date of Birth</Label>
							<Input
								id="dateOfBirth"
								name="dateOfBirth"
								type="date"
								defaultValue={tenant?.dateOfBirth ?? ""}
							/>
						</div>
					</div>
					<div className="space-y-1">
						<Label htmlFor="unitId">Assign to Unit</Label>
						<Select name="unitId" defaultValue={tenant?.unitId ?? defaultUnitId ?? ""}>
							<SelectTrigger id="unitId">
								<SelectValue placeholder="Select a unit (optional)" />
							</SelectTrigger>
							<SelectContent>
								{unitOptions.map((u) => (
									<SelectItem key={u.id} value={u.id}>
										{u.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="border-t pt-4 space-y-3">
						<p className="text-sm font-medium">Emergency Contact</p>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label htmlFor="emergencyContactName">Name</Label>
								<Input
									id="emergencyContactName"
									name="emergencyContactName"
									defaultValue={tenant?.emergencyContactName ?? ""}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="emergencyContactRelationship">Relationship</Label>
								<Input
									id="emergencyContactRelationship"
									name="emergencyContactRelationship"
									defaultValue={tenant?.emergencyContactRelationship ?? ""}
									placeholder="Spouse, Parent…"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label htmlFor="emergencyContactPhone">Phone</Label>
								<Input
									id="emergencyContactPhone"
									name="emergencyContactPhone"
									type="tel"
									defaultValue={tenant?.emergencyContactPhone ?? ""}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="emergencyContactEmail">Email</Label>
								<Input
									id="emergencyContactEmail"
									name="emergencyContactEmail"
									type="email"
									defaultValue={tenant?.emergencyContactEmail ?? ""}
								/>
							</div>
						</div>
					</div>

					<div className="space-y-1">
						<Label htmlFor="notes">Notes</Label>
						<Input
							id="notes"
							name="notes"
							defaultValue={tenant?.notes ?? ""}
							placeholder="Internal notes (not visible to tenant)"
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Saving…" : isEdit ? "Save Changes" : "Add Tenant"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
