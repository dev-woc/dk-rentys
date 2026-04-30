import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSessionPrincipal } from "@/lib/auth/principal";

export const dynamic = "force-dynamic";

export default async function AppEntryPage({
	searchParams,
}: {
	searchParams: Promise<{ role?: string }>;
}) {
	const principal = await getSessionPrincipal();
	if ("error" in principal) redirect("/login");
	const { role } = await searchParams;

	if (principal.owner && principal.tenant) {
		if (role === "owner") redirect("/dashboard");
		if (role === "tenant") redirect("/tenant");

		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
					<h1 className="text-2xl font-bold">Choose a Portal</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						This account is linked to both an owner profile and a tenant profile.
					</p>
					<div className="mt-6 grid gap-3">
						<Button asChild>
							<Link href="/dashboard">Open Owner Dashboard</Link>
						</Button>
						<Button asChild variant="outline">
							<Link href="/tenant">Open Tenant Portal</Link>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	if (principal.tenant && !principal.owner) {
		redirect("/tenant");
	}

	redirect("/dashboard");
}
