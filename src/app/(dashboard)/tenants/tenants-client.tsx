"use client";

import { useCallback, useEffect, useState } from "react";
import { TenantCard } from "@/components/tenants/tenant-card";
import { TenantForm } from "@/components/tenants/tenant-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TenantWithDetails } from "@/types";

export function TenantsClient() {
	const [tenants, setTenants] = useState<TenantWithDetails[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [addOpen, setAddOpen] = useState(false);

	const fetchTenants = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/tenants");
			if (res.ok) {
				const json = await res.json();
				setTenants(json.tenants ?? []);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchTenants();
	}, [fetchTenants]);

	const filtered = tenants.filter((t) => {
		const q = search.toLowerCase();
		return (
			t.fullName.toLowerCase().includes(q) ||
			t.email.toLowerCase().includes(q) ||
			t.phone.includes(q)
		);
	});

	return (
		<div className="p-8 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Tenants</h1>
					<p className="text-muted-foreground mt-1">Manage your tenant roster</p>
				</div>
				<Button onClick={() => setAddOpen(true)}>Add Tenant</Button>
			</div>

			{!loading && tenants.length > 0 && (
				<Input
					placeholder="Search by name, email, or phone…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-sm"
				/>
			)}

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : tenants.length === 0 ? (
				<div className="rounded-lg border border-dashed p-12 text-center">
					<p className="text-muted-foreground">No tenants yet.</p>
					<Button className="mt-4" onClick={() => setAddOpen(true)}>
						Add Your First Tenant
					</Button>
				</div>
			) : filtered.length === 0 ? (
				<p className="text-sm text-muted-foreground">No tenants match your search.</p>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((tenant) => (
						<TenantCard key={tenant.id} tenant={tenant} />
					))}
				</div>
			)}

			<TenantForm open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchTenants} />
		</div>
	);
}
