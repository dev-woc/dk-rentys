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
import type { Payment } from "@/types";

interface TenantPaymentOption {
	id: string;
	label: string;
	unitId: string;
}

interface PaymentFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tenantId?: string;
	unitId?: string;
	tenantOptions?: TenantPaymentOption[];
	payment?: Payment;
	onSuccess: () => void;
}

const METHOD_OPTIONS = [
	{ value: "ach", label: "ACH" },
	{ value: "card", label: "Card" },
	{ value: "cash", label: "Cash" },
	{ value: "check", label: "Check" },
	{ value: "zelle", label: "Zelle" },
	{ value: "venmo", label: "Venmo" },
	{ value: "other", label: "Other" },
] as const;

const STATUS_OPTIONS = [
	{ value: "pending", label: "Due" },
	{ value: "paid", label: "Paid" },
	{ value: "late", label: "Late" },
	{ value: "partial", label: "Partial" },
	{ value: "failed", label: "Failed" },
] as const;

export function PaymentForm({
	open,
	onOpenChange,
	tenantId,
	unitId,
	tenantOptions = [],
	payment,
	onSuccess,
}: PaymentFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [selectedTenantId, setSelectedTenantId] = useState(payment?.tenantId ?? tenantId ?? "");
	const [status, setStatus] = useState(payment?.status ?? "pending");
	const [method, setMethod] = useState(payment?.method ?? "");
	const isEdit = !!payment;

	useEffect(() => {
		if (!open) return;
		setError("");
		setSelectedTenantId(payment?.tenantId ?? tenantId ?? tenantOptions[0]?.id ?? "");
		setStatus(payment?.status ?? "pending");
		setMethod(payment?.method ?? "");
	}, [open, payment, tenantId, tenantOptions]);

	const resolvedUnitId = (() => {
		if (payment?.unitId) return payment.unitId;
		if (unitId) return unitId;
		return tenantOptions.find((option) => option.id === selectedTenantId)?.unitId ?? "";
	})();

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");

		if (!resolvedUnitId) {
			setError("Select a tenant with an assigned unit.");
			return;
		}

		setLoading(true);
		const form = e.currentTarget;
		const fd = new FormData(form);

		const body = {
			tenantId: payment?.tenantId ?? tenantId ?? selectedTenantId,
			unitId: resolvedUnitId,
			amount: Number(fd.get("amount")),
			dueDate: fd.get("dueDate") as string,
			method: (fd.get("method") as string) || null,
			notes: (fd.get("notes") as string) || "",
			status: isEdit ? (fd.get("status") as string) || payment.status : undefined,
			paidDate: isEdit ? (fd.get("paidDate") as string) || null : undefined,
			lateFeeAmount: isEdit ? Number(fd.get("lateFeeAmount") || 0) : undefined,
		};

		try {
			const url = isEdit ? `/api/payments/${payment.id}` : "/api/payments";
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
					<DialogTitle>{isEdit ? "Edit Payment" : "Add Payment"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					{!isEdit && tenantOptions.length > 0 && (
						<div className="space-y-1">
							<Label htmlFor="tenantId">Tenant</Label>
							<Select name="tenantId" value={selectedTenantId} onValueChange={setSelectedTenantId}>
								<SelectTrigger id="tenantId">
									<SelectValue placeholder="Select a tenant" />
								</SelectTrigger>
								<SelectContent>
									{tenantOptions.map((option) => (
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
							<Label htmlFor="amount">Amount ($)</Label>
							<Input
								id="amount"
								name="amount"
								type="number"
								min="0"
								step="0.01"
								required
								defaultValue={payment ? Number(payment.amount) : ""}
								placeholder="0.00"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="dueDate">Due Date</Label>
							<Input
								id="dueDate"
								name="dueDate"
								type="date"
								required
								defaultValue={payment?.dueDate ?? ""}
							/>
						</div>
					</div>

					<div className="space-y-1">
						<Label htmlFor="method">Method</Label>
						<Select name="method" value={method || undefined} onValueChange={setMethod}>
							<SelectTrigger id="method">
								<SelectValue placeholder="Select a method" />
							</SelectTrigger>
							<SelectContent>
								{METHOD_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{isEdit && (
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
								<Label htmlFor="lateFeeAmount">Late Fee ($)</Label>
								<Input
									id="lateFeeAmount"
									name="lateFeeAmount"
									type="number"
									min="0"
									step="0.01"
									defaultValue={Number(payment.lateFeeAmount ?? 0)}
								/>
							</div>
						</div>
					)}

					{isEdit && (status === "paid" || status === "partial") && (
						<div className="space-y-1">
							<Label htmlFor="paidDate">Paid Date</Label>
							<Input
								id="paidDate"
								name="paidDate"
								type="date"
								defaultValue={payment?.paidDate ?? ""}
							/>
						</div>
					)}

					<div className="space-y-1">
						<Label htmlFor="notes">Notes</Label>
						<Input
							id="notes"
							name="notes"
							defaultValue={payment?.notes ?? ""}
							placeholder="Check #1042, April rent, partial payment…"
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Saving…" : isEdit ? "Save Changes" : "Add Payment"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
