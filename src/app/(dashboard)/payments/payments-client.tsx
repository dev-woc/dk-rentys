"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentBadge } from "@/components/payments/payment-badge";
import { PaymentForm } from "@/components/payments/payment-form";
import { Button } from "@/components/ui/button";
import type {
	PaymentStatus,
	PaymentWithDetails,
	PropertyWithUnits,
	TenantWithDetails,
} from "@/types";

type PaymentFilter = "all" | PaymentStatus;

interface TenantOption {
	id: string;
	label: string;
	unitId: string;
}

const FILTERS: { value: PaymentFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "pending", label: "Due" },
	{ value: "late", label: "Late" },
	{ value: "paid", label: "Paid" },
];

export function PaymentsClient() {
	const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<PaymentFilter>("all");
	const [addOpen, setAddOpen] = useState(false);
	const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);

	const fetchPayments = useCallback(async () => {
		setLoading(true);
		try {
			const [paymentsRes, tenantsRes, propertiesRes] = await Promise.all([
				fetch("/api/payments"),
				fetch("/api/tenants"),
				fetch("/api/properties"),
			]);

			if (paymentsRes.ok) {
				const json = await paymentsRes.json();
				setPayments(json.payments ?? []);
			}

			if (tenantsRes.ok && propertiesRes.ok) {
				const tenantsJson = (await tenantsRes.json()) as { tenants?: TenantWithDetails[] };
				const propertiesJson = (await propertiesRes.json()) as { properties?: PropertyWithUnits[] };
				const propertyLabels = new Map<string, string>();
				for (const property of propertiesJson.properties ?? []) {
					for (const unit of property.units) {
						const label = `${property.address}${unit.unitNumber ? ` — Unit ${unit.unitNumber}` : ""}`;
						propertyLabels.set(unit.id, label);
					}
				}

				setTenantOptions(
					(tenantsJson.tenants ?? [])
						.filter((tenant) => tenant.unitId)
						.map((tenant) => ({
							id: tenant.id,
							unitId: tenant.unitId as string,
							label: `${tenant.fullName} · ${propertyLabels.get(tenant.unitId as string) ?? "Assigned unit"}`,
						})),
				);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPayments();
	}, [fetchPayments]);

	const filteredPayments = useMemo(
		() => payments.filter((payment) => (filter === "all" ? true : payment.status === filter)),
		[payments, filter],
	);

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">Payments</h1>
					<p className="mt-1 text-muted-foreground">Track rent collection across your portfolio</p>
				</div>
				<Button onClick={() => setAddOpen(true)} disabled={tenantOptions.length === 0}>
					Add Payment
				</Button>
			</div>

			<div className="flex flex-wrap gap-2">
				{FILTERS.map((option) => (
					<Button
						key={option.value}
						variant={filter === option.value ? "default" : "outline"}
						size="sm"
						onClick={() => setFilter(option.value)}
					>
						{option.label}
					</Button>
				))}
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : filteredPayments.length === 0 ? (
				<div className="rounded-lg border border-dashed p-12 text-center">
					<p className="text-muted-foreground">
						{payments.length === 0 ? "No payments recorded yet." : "No payments match this filter."}
					</p>
				</div>
			) : (
				<div className="divide-y rounded-lg border">
					{filteredPayments.map((payment) => (
						<div key={payment.id} className="flex items-center justify-between gap-4 px-4 py-3">
							<div className="space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<Link
										href={`/tenants/${payment.tenantId}`}
										className="font-medium hover:underline"
									>
										{payment.tenant.fullName}
									</Link>
									<PaymentBadge status={payment.status as PaymentStatus} />
								</div>
								<p className="text-sm text-muted-foreground">
									{payment.unit.property.address}
									{payment.unit.unitNumber ? ` — Unit ${payment.unit.unitNumber}` : ""}
								</p>
								<p className="text-sm text-muted-foreground">
									${Number(payment.amount).toLocaleString()} due{" "}
									{new Date(payment.dueDate).toLocaleDateString()}
									{payment.paidDate
										? ` · paid ${new Date(payment.paidDate).toLocaleDateString()}`
										: ""}
								</p>
							</div>
						</div>
					))}
				</div>
			)}

			<PaymentForm
				open={addOpen}
				onOpenChange={setAddOpen}
				tenantOptions={tenantOptions}
				onSuccess={fetchPayments}
			/>
		</div>
	);
}
