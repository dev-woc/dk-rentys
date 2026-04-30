"use client";

import { useState } from "react";
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
import type { Lease } from "@/types";

interface LeaseFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	unitId: string;
	tenantId: string;
	lease?: Lease;
	onSuccess: () => void;
}

export function LeaseForm({
	open,
	onOpenChange,
	unitId,
	tenantId,
	lease,
	onSuccess,
}: LeaseFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const isEdit = !!lease;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const form = e.currentTarget;
		const fd = new FormData(form);

		const body = {
			unitId,
			tenantId,
			startDate: fd.get("startDate") as string,
			endDate: fd.get("endDate") as string,
			monthlyRent: Number(fd.get("monthlyRent")),
			securityDeposit: Number(fd.get("securityDeposit") || 0),
			lateFeePolicy: (fd.get("lateFeePolicy") as string) || "",
			status: (fd.get("status") as string) || "active",
		};

		try {
			const url = isEdit ? `/api/leases/${lease.id}` : "/api/leases";
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
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Lease" : "Add Lease"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="startDate">Start Date</Label>
							<Input
								id="startDate"
								name="startDate"
								type="date"
								required
								defaultValue={lease?.startDate ?? ""}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="endDate">End Date</Label>
							<Input
								id="endDate"
								name="endDate"
								type="date"
								required
								defaultValue={lease?.endDate ?? ""}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="monthlyRent">Monthly Rent ($)</Label>
							<Input
								id="monthlyRent"
								name="monthlyRent"
								type="number"
								min="0"
								step="0.01"
								required
								defaultValue={lease ? Number(lease.monthlyRent) : ""}
								placeholder="0.00"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="securityDeposit">Security Deposit ($)</Label>
							<Input
								id="securityDeposit"
								name="securityDeposit"
								type="number"
								min="0"
								step="0.01"
								defaultValue={lease ? Number(lease.securityDeposit) : ""}
								placeholder="0.00"
							/>
						</div>
					</div>
					{isEdit && (
						<div className="space-y-1">
							<Label htmlFor="status">Status</Label>
							<Select name="status" defaultValue={lease.status}>
								<SelectTrigger id="status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="month_to_month">Month-to-Month</SelectItem>
									<SelectItem value="expired">Expired</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}
					<div className="space-y-1">
						<Label htmlFor="lateFeePolicy">Late Fee Policy</Label>
						<Input
							id="lateFeePolicy"
							name="lateFeePolicy"
							defaultValue={lease?.lateFeePolicy ?? ""}
							placeholder="e.g. $50 after 5-day grace period"
						/>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Saving…" : isEdit ? "Save Changes" : "Add Lease"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
