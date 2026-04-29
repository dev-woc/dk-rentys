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
import type { Property } from "@/types";

interface PropertyFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	property?: Property;
	onSuccess: () => void;
}

const PROPERTY_TYPES = [
	{ value: "single_family", label: "Single Family" },
	{ value: "multi_unit", label: "Multi Unit" },
	{ value: "condo", label: "Condo" },
	{ value: "townhouse", label: "Townhouse" },
] as const;

export function PropertyForm({ open, onOpenChange, property, onSuccess }: PropertyFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const isEdit = !!property;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const form = e.currentTarget;
		const data = new FormData(form);

		const mortgageRaw = data.get("mortgagePayment") as string;

		const body = {
			address: data.get("address") as string,
			city: data.get("city") as string,
			state: data.get("state") as string,
			zip: data.get("zip") as string,
			propertyType: data.get("propertyType") as string,
			purchaseDate: (data.get("purchaseDate") as string) || null,
			mortgagePayment: mortgageRaw ? Number(mortgageRaw) : null,
			notes: data.get("notes") as string,
		};

		try {
			const url = isEdit ? `/api/properties/${property.id}` : "/api/properties";
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
					<DialogTitle>{isEdit ? "Edit Property" : "Add Property"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-1 gap-4">
						<div className="space-y-1">
							<Label htmlFor="address">Street Address</Label>
							<Input
								id="address"
								name="address"
								required
								defaultValue={property?.address ?? ""}
								placeholder="123 Main St"
							/>
						</div>
						<div className="grid grid-cols-3 gap-3">
							<div className="col-span-2 space-y-1">
								<Label htmlFor="city">City</Label>
								<Input id="city" name="city" required defaultValue={property?.city ?? ""} />
							</div>
							<div className="space-y-1">
								<Label htmlFor="state">State</Label>
								<Input
									id="state"
									name="state"
									required
									maxLength={2}
									defaultValue={property?.state ?? ""}
									placeholder="TX"
									className="uppercase"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label htmlFor="zip">ZIP</Label>
								<Input
									id="zip"
									name="zip"
									required
									defaultValue={property?.zip ?? ""}
									placeholder="75001"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="propertyType">Type</Label>
								<Select
									name="propertyType"
									defaultValue={property?.propertyType ?? "single_family"}
								>
									<SelectTrigger id="propertyType">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PROPERTY_TYPES.map((t) => (
											<SelectItem key={t.value} value={t.value}>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label htmlFor="purchaseDate">Purchase Date</Label>
								<Input
									id="purchaseDate"
									name="purchaseDate"
									type="date"
									defaultValue={property?.purchaseDate ?? ""}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="mortgagePayment">Monthly Mortgage ($)</Label>
								<Input
									id="mortgagePayment"
									name="mortgagePayment"
									type="number"
									min="0"
									step="0.01"
									defaultValue={property?.mortgagePayment ?? ""}
									placeholder="0.00"
								/>
							</div>
						</div>
						<div className="space-y-1">
							<Label htmlFor="notes">Notes</Label>
							<Input
								id="notes"
								name="notes"
								defaultValue={property?.notes ?? ""}
								placeholder="Optional notes"
							/>
						</div>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Saving…" : isEdit ? "Save Changes" : "Add Property"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
