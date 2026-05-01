"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/maintenance/status-badge";
import { UrgencyBadge } from "@/components/maintenance/urgency-badge";
import { PaymentBadge } from "@/components/payments/payment-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
	MaintenanceStatus,
	MaintenanceUrgency,
	PaymentStatus,
	TenantPortalProfile,
} from "@/types";

export function TenantDashboardClient() {
	const [tenant, setTenant] = useState<TenantPortalProfile | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchTenant = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/tenant/me");
			if (res.ok) {
				const json = await res.json();
				setTenant(json.tenant ?? null);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchTenant();
	}, [fetchTenant]);

	if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
	if (!tenant)
		return <div className="p-8 text-sm text-muted-foreground">Tenant account not found.</div>;

	const activeLease = tenant.leases.find((lease) => lease.status !== "expired") ?? null;
	const recentPayments = [...tenant.payments]
		.sort((a, b) => b.dueDate.localeCompare(a.dueDate))
		.slice(0, 5);
	const recentRequests = [...tenant.maintenanceRequests]
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, 4);

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-8">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">Welcome, {tenant.fullName}</h1>
					<p className="mt-1 text-muted-foreground">
						{tenant.unit
							? `${tenant.unit.property.address}${tenant.unit.unitNumber ? ` — Unit ${tenant.unit.unitNumber}` : ""}`
							: "No unit assigned yet"}
					</p>
				</div>
				<Button asChild>
					<Link href="/tenant/maintenance">Submit Maintenance Request</Link>
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Lease</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1 text-sm">
						{activeLease ? (
							<>
								<p>
									<span className="font-medium">Rent:</span> $
									{Number(activeLease.monthlyRent).toLocaleString()}/mo
								</p>
								<p>
									<span className="font-medium">Ends:</span>{" "}
									{new Date(activeLease.endDate).toLocaleDateString()}
								</p>
							</>
						) : (
							<p className="text-muted-foreground">No active lease on file.</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Payments</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1 text-sm">
						<p>
							<span className="font-medium">History:</span> {tenant.payments.length} recorded
							payment
							{tenant.payments.length === 1 ? "" : "s"}
						</p>
						<p>
							<span className="font-medium">Outstanding:</span>{" "}
							{
								tenant.payments.filter(
									(payment) => payment.status === "pending" || payment.status === "late",
								).length
							}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Maintenance</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1 text-sm">
						<p>
							<span className="font-medium">Open requests:</span>{" "}
							{tenant.maintenanceRequests.filter((request) => request.status !== "resolved").length}
						</p>
						<p>
							<span className="font-medium">Resolved:</span>{" "}
							{tenant.maintenanceRequests.filter((request) => request.status === "resolved").length}
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Recent Payments</CardTitle>
					</CardHeader>
					<CardContent>
						{recentPayments.length === 0 ? (
							<p className="text-sm text-muted-foreground">No payments recorded yet.</p>
						) : (
							<div className="space-y-3">
								{recentPayments.map((payment) => (
									<div key={payment.id} className="flex items-center justify-between gap-3">
										<div>
											<p className="font-medium">${Number(payment.amount).toLocaleString()}</p>
											<p className="text-sm text-muted-foreground">
												Due {new Date(payment.dueDate).toLocaleDateString()}
											</p>
										</div>
										<PaymentBadge status={payment.status as PaymentStatus} />
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Recent Maintenance</CardTitle>
					</CardHeader>
					<CardContent>
						{recentRequests.length === 0 ? (
							<p className="text-sm text-muted-foreground">No maintenance requests yet.</p>
						) : (
							<div className="space-y-3">
								{recentRequests.map((request) => (
									<div key={request.id} className="space-y-1">
										<div className="flex flex-wrap items-center gap-2">
											<UrgencyBadge urgency={request.urgency as MaintenanceUrgency} />
											<StatusBadge status={request.status as MaintenanceStatus} />
											<span className="font-medium">{request.category}</span>
										</div>
										<p className="text-sm text-muted-foreground">
											{request.description.length > 90
												? `${request.description.slice(0, 90)}…`
												: request.description}
										</p>
										{request.photos[0] && (
											<a href={request.photos[0]} target="_blank" rel="noreferrer">
												<img
													src={request.photos[0]}
													alt="Maintenance request"
													className="h-16 w-16 rounded-md border object-cover"
												/>
											</a>
										)}
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
