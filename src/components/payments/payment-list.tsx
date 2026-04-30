"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Payment, PaymentStatus } from "@/types";
import { PaymentBadge } from "./payment-badge";
import { PaymentForm } from "./payment-form";

interface PaymentListProps {
	tenantId: string;
	unitId: string;
	payments: Payment[];
	onMutate: () => void;
}

export function PaymentList({ tenantId, unitId, payments, onMutate }: PaymentListProps) {
	const [editPayment, setEditPayment] = useState<Payment | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const sortedPayments = useMemo(
		() =>
			[...payments].sort((a, b) => {
				const aOpen = a.status === "pending" || a.status === "late";
				const bOpen = b.status === "pending" || b.status === "late";
				if (aOpen !== bOpen) return aOpen ? -1 : 1;
				return b.dueDate.localeCompare(a.dueDate);
			}),
		[payments],
	);

	async function handleDelete(paymentId: string) {
		setDeletingId(paymentId);
		try {
			await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
			onMutate();
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold">Payments</h3>
				<Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
					Add Payment
				</Button>
			</div>

			{sortedPayments.length === 0 ? (
				<p className="text-sm text-muted-foreground">No payments recorded yet.</p>
			) : (
				<div className="divide-y rounded-lg border">
					{sortedPayments.map((payment) => (
						<div key={payment.id} className="flex items-center justify-between gap-4 px-4 py-3">
							<div>
								<div className="flex items-center gap-2">
									<span className="font-medium">
										${Number(payment.amount).toLocaleString()}
									</span>
									<PaymentBadge status={payment.status as PaymentStatus} />
								</div>
								<p className="text-sm text-muted-foreground">
									Due {new Date(payment.dueDate).toLocaleDateString()}
									{payment.paidDate
										? ` · Paid ${new Date(payment.paidDate).toLocaleDateString()}`
										: ""}
								</p>
								{payment.notes && (
									<p className="text-sm text-muted-foreground">{payment.notes}</p>
								)}
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="outline" onClick={() => setEditPayment(payment)}>
									Edit
								</Button>
								<Button
									size="sm"
									variant="destructive"
									disabled={deletingId === payment.id}
									onClick={() => handleDelete(payment.id)}
								>
									{deletingId === payment.id ? "…" : "Delete"}
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<PaymentForm
				open={addOpen}
				onOpenChange={setAddOpen}
				tenantId={tenantId}
				unitId={unitId}
				onSuccess={onMutate}
			/>

			{editPayment && (
				<PaymentForm
					open={!!editPayment}
					onOpenChange={(open) => !open && setEditPayment(null)}
					tenantId={tenantId}
					unitId={unitId}
					payment={editPayment}
					onSuccess={() => {
						setEditPayment(null);
						onMutate();
					}}
				/>
			)}
		</div>
	);
}
