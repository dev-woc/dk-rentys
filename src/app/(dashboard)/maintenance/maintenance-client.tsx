"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MaintenanceList } from "@/components/maintenance/maintenance-list";
import { Button } from "@/components/ui/button";
import type { MaintenanceRequestWithDetails, PropertyWithUnits, Vendor } from "@/types";

type StatusFilter = "all" | "open" | "resolved";
type UrgencyFilter = "all" | "Emergency" | "Urgent" | "Routine";

interface UnitOption {
	id: string;
	label: string;
}

export function MaintenanceClient() {
	const [requests, setRequests] = useState<MaintenanceRequestWithDetails[]>([]);
	const [vendors, setVendors] = useState<Vendor[]>([]);
	const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const [requestsRes, vendorsRes, propertiesRes] = await Promise.all([
				fetch("/api/maintenance"),
				fetch("/api/vendors"),
				fetch("/api/properties"),
			]);

			if (requestsRes.ok) {
				const json = await requestsRes.json();
				setRequests(json.requests ?? []);
			}

			if (vendorsRes.ok) {
				const json = await vendorsRes.json();
				setVendors(json.vendors ?? []);
			}

			if (propertiesRes.ok) {
				const json = (await propertiesRes.json()) as { properties?: PropertyWithUnits[] };
				const options = (json.properties ?? []).flatMap((property) =>
					property.units.map((unit) => ({
						id: unit.id,
						label: `${property.address}${unit.unitNumber ? ` — Unit ${unit.unitNumber}` : ""}`,
					})),
				);
				setUnitOptions(options);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const filteredRequests = useMemo(
		() =>
			requests.filter((request) => {
				const statusMatch =
					statusFilter === "all"
						? true
						: statusFilter === "resolved"
							? request.status === "resolved"
							: request.status !== "resolved";
				const urgencyMatch = urgencyFilter === "all" ? true : request.urgency === urgencyFilter;
				return statusMatch && urgencyMatch;
			}),
		[requests, statusFilter, urgencyFilter],
	);

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">Maintenance</h1>
					<p className="mt-1 text-muted-foreground">Track open repairs and vendor assignments</p>
				</div>
				<Button asChild variant="outline">
					<Link href="/maintenance/vendors">Manage Vendors</Link>
				</Button>
			</div>

			<div className="flex flex-wrap gap-2">
				{(["all", "open", "resolved"] as const).map((value) => (
					<Button
						key={value}
						size="sm"
						variant={statusFilter === value ? "default" : "outline"}
						onClick={() => setStatusFilter(value)}
					>
						{value === "all" ? "All" : value === "open" ? "Open" : "Resolved"}
					</Button>
				))}
			</div>

			<div className="flex flex-wrap gap-2">
				{(["all", "Emergency", "Urgent", "Routine"] as const).map((value) => (
					<Button
						key={value}
						size="sm"
						variant={urgencyFilter === value ? "default" : "outline"}
						onClick={() => setUrgencyFilter(value)}
					>
						{value}
					</Button>
				))}
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : (
				<MaintenanceList
					requests={filteredRequests}
					onMutate={fetchData}
					unitOptions={unitOptions}
					vendors={vendors}
				/>
			)}
		</div>
	);
}
