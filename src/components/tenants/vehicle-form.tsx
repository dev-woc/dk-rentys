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
import type { Vehicle } from "@/types";

interface VehicleFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tenantId: string;
	vehicle?: Vehicle;
	onSuccess: () => void;
}

export function VehicleForm({
	open,
	onOpenChange,
	tenantId,
	vehicle,
	onSuccess,
}: VehicleFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const isEdit = !!vehicle;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const form = e.currentTarget;
		const fd = new FormData(form);

		const body = {
			make: fd.get("make") as string,
			model: fd.get("model") as string,
			year: Number(fd.get("year")),
			color: (fd.get("color") as string) || "",
			plateNumber: (fd.get("plateNumber") as string).toUpperCase(),
			plateState: (fd.get("plateState") as string).toUpperCase(),
			parkingSpot: (fd.get("parkingSpot") as string) || "",
			isAuthorized: fd.get("isAuthorized") === "on",
		};

		try {
			const url = isEdit
				? `/api/tenants/${tenantId}/vehicles/${vehicle.id}`
				: `/api/tenants/${tenantId}/vehicles`;
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
					<DialogTitle>{isEdit ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="make">Make</Label>
							<Input
								id="make"
								name="make"
								required
								defaultValue={vehicle?.make ?? ""}
								placeholder="Toyota"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="model">Model</Label>
							<Input
								id="model"
								name="model"
								required
								defaultValue={vehicle?.model ?? ""}
								placeholder="Camry"
							/>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-3">
						<div className="space-y-1">
							<Label htmlFor="year">Year</Label>
							<Input
								id="year"
								name="year"
								type="number"
								required
								min="1900"
								max={new Date().getFullYear() + 1}
								defaultValue={vehicle?.year ?? ""}
							/>
						</div>
						<div className="col-span-2 space-y-1">
							<Label htmlFor="color">Color</Label>
							<Input
								id="color"
								name="color"
								defaultValue={vehicle?.color ?? ""}
								placeholder="Silver"
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="plateNumber">Plate Number</Label>
							<Input
								id="plateNumber"
								name="plateNumber"
								required
								maxLength={10}
								defaultValue={vehicle?.plateNumber ?? ""}
								placeholder="ABC1234"
								className="uppercase"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="plateState">State</Label>
							<Input
								id="plateState"
								name="plateState"
								required
								maxLength={2}
								defaultValue={vehicle?.plateState ?? ""}
								placeholder="TX"
								className="uppercase"
							/>
						</div>
					</div>
					<div className="space-y-1">
						<Label htmlFor="parkingSpot">Parking Spot</Label>
						<Input
							id="parkingSpot"
							name="parkingSpot"
							defaultValue={vehicle?.parkingSpot ?? ""}
							placeholder="A1 (optional)"
						/>
					</div>
					<div className="flex items-center gap-2">
						<input
							id="isAuthorized"
							name="isAuthorized"
							type="checkbox"
							defaultChecked={vehicle?.isAuthorized ?? true}
							className="h-4 w-4"
						/>
						<Label htmlFor="isAuthorized">Authorized vehicle</Label>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Saving…" : isEdit ? "Save Changes" : "Add Vehicle"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
