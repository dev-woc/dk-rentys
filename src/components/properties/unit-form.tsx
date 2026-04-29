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
import type { Unit } from "@/types";

interface UnitFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	propertyId: string;
	unit?: Unit;
	onSuccess: () => void;
}

export function UnitForm({ open, onOpenChange, propertyId, unit, onSuccess }: UnitFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const isEdit = !!unit;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const form = e.currentTarget;
		const data = new FormData(form);
		const sqftRaw = data.get("sqft") as string;

		const body = {
			unitNumber: data.get("unitNumber") as string,
			bedrooms: Number(data.get("bedrooms")),
			bathrooms: Number(data.get("bathrooms")),
			sqft: sqftRaw ? Number(sqftRaw) : null,
		};

		try {
			const url = isEdit
				? `/api/properties/${propertyId}/units/${unit.id}`
				: `/api/properties/${propertyId}/units`;
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
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Unit" : "Add Unit"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="unitNumber">Unit Number</Label>
						<Input
							id="unitNumber"
							name="unitNumber"
							defaultValue={unit?.unitNumber ?? ""}
							placeholder="e.g. 1A, 2B"
						/>
					</div>
					<div className="grid grid-cols-3 gap-3">
						<div className="space-y-1">
							<Label htmlFor="bedrooms">Beds</Label>
							<Input
								id="bedrooms"
								name="bedrooms"
								type="number"
								min="0"
								max="20"
								required
								defaultValue={unit?.bedrooms ?? 1}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="bathrooms">Baths</Label>
							<Input
								id="bathrooms"
								name="bathrooms"
								type="number"
								min="0"
								max="20"
								required
								defaultValue={unit?.bathrooms ?? 1}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="sqft">Sq Ft</Label>
							<Input
								id="sqft"
								name="sqft"
								type="number"
								min="1"
								defaultValue={unit?.sqft ?? ""}
								placeholder="—"
							/>
						</div>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Saving…" : isEdit ? "Save Changes" : "Add Unit"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
