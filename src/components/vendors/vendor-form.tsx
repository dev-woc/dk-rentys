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
import { Textarea } from "@/components/ui/textarea";
import type { Vendor } from "@/types";

interface VendorFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	vendor?: Vendor;
	onSuccess: () => void;
}

const TRADE_OPTIONS = [
	"Plumber",
	"Electrician",
	"HVAC",
	"Handyman",
	"Pest Control",
	"Landscaping",
	"Other",
] as const;

export function VendorForm({ open, onOpenChange, vendor, onSuccess }: VendorFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [trade, setTrade] = useState(vendor?.trade ?? "");
	const isEdit = !!vendor;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const form = e.currentTarget;
		const fd = new FormData(form);
		const body = {
			name: fd.get("name") as string,
			trade: fd.get("trade") as string,
			phone: (fd.get("phone") as string) || "",
			email: (fd.get("email") as string) || "",
			typicalRate: (fd.get("typicalRate") as string) || "",
			notes: (fd.get("notes") as string) || "",
			isPreferred: fd.get("isPreferred") === "on",
			rating: fd.get("rating") ? Number(fd.get("rating")) : null,
		};

		try {
			const url = isEdit ? `/api/vendors/${vendor.id}` : "/api/vendors";
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
					<DialogTitle>{isEdit ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="name">Name</Label>
							<Input id="name" name="name" required defaultValue={vendor?.name ?? ""} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="trade">Trade</Label>
							<Select name="trade" value={trade} onValueChange={setTrade}>
								<SelectTrigger id="trade">
									<SelectValue placeholder="Select a trade" />
								</SelectTrigger>
								<SelectContent>
									{TRADE_OPTIONS.map((option) => (
										<SelectItem key={option} value={option}>
											{option}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="phone">Phone</Label>
							<Input id="phone" name="phone" defaultValue={vendor?.phone ?? ""} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="email">Email</Label>
							<Input id="email" name="email" type="email" defaultValue={vendor?.email ?? ""} />
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="typicalRate">Typical Rate</Label>
							<Input
								id="typicalRate"
								name="typicalRate"
								defaultValue={vendor?.typicalRate ?? ""}
								placeholder="$85/hr"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="rating">Rating</Label>
							<Input
								id="rating"
								name="rating"
								type="number"
								min="1"
								max="5"
								defaultValue={vendor?.rating ?? ""}
							/>
						</div>
					</div>

					<div className="space-y-1">
						<Label htmlFor="notes">Notes</Label>
						<Textarea id="notes" name="notes" defaultValue={vendor?.notes ?? ""} />
					</div>

					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="isPreferred"
							defaultChecked={vendor?.isPreferred ?? false}
							className="size-4"
						/>
						Preferred vendor
					</label>

					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Saving…" : isEdit ? "Save Changes" : "Add Vendor"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
