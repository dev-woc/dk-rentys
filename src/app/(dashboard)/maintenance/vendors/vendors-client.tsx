"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorForm } from "@/components/vendors/vendor-form";
import type { Vendor } from "@/types";

export function VendorsClient() {
	const [vendors, setVendors] = useState<Vendor[]>([]);
	const [loading, setLoading] = useState(true);
	const [addOpen, setAddOpen] = useState(false);
	const [editVendor, setEditVendor] = useState<Vendor | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const fetchVendors = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/vendors");
			if (res.ok) {
				const json = await res.json();
				setVendors(json.vendors ?? []);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchVendors();
	}, [fetchVendors]);

	async function handleDelete(vendorId: string) {
		setDeletingId(vendorId);
		try {
			await fetch(`/api/vendors/${vendorId}`, { method: "DELETE" });
			fetchVendors();
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">Vendors</h1>
					<p className="mt-1 text-muted-foreground">Preferred trades and contact details</p>
				</div>
				<Button onClick={() => setAddOpen(true)}>Add Vendor</Button>
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : vendors.length === 0 ? (
				<div className="rounded-lg border border-dashed p-12 text-center">
					<p className="text-muted-foreground">No vendors added yet.</p>
				</div>
			) : (
				<div className="divide-y rounded-lg border">
					{vendors.map((vendor) => (
						<div key={vendor.id} className="flex items-center justify-between gap-4 px-4 py-3">
							<div className="space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-medium">{vendor.name}</span>
									<Badge variant="outline">{vendor.trade}</Badge>
									{vendor.isPreferred && <Badge>Preferred</Badge>}
								</div>
								<p className="text-sm text-muted-foreground">
									{vendor.phone || "No phone"}
									{vendor.email ? ` · ${vendor.email}` : ""}
								</p>
								<p className="text-sm text-muted-foreground">
									{vendor.rating ? `${"★".repeat(vendor.rating)}` : "No rating"}
									{vendor.typicalRate ? ` · ${vendor.typicalRate}` : ""}
								</p>
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="outline" onClick={() => setEditVendor(vendor)}>
									Edit
								</Button>
								<Button
									size="sm"
									variant="destructive"
									disabled={deletingId === vendor.id}
									onClick={() => handleDelete(vendor.id)}
								>
									{deletingId === vendor.id ? "…" : "Delete"}
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<VendorForm open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchVendors} />

			{editVendor && (
				<VendorForm
					open={!!editVendor}
					onOpenChange={(open) => !open && setEditVendor(null)}
					vendor={editVendor}
					onSuccess={() => {
						setEditVendor(null);
						fetchVendors();
					}}
				/>
			)}
		</div>
	);
}
