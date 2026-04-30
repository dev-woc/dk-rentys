"use client";

import { Building2, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

const NAV_LINKS = [
	{ href: "/tenant", label: "Overview" },
	{ href: "/tenant/maintenance", label: "Maintenance" },
];

export function TenantLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const { data: session } = authClient.useSession();

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/login");
	};

	return (
		<div className="min-h-screen bg-background">
			<nav className="border-b bg-card">
				<div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2">
							<Building2 className="h-5 w-5" />
							<Link href="/tenant" className="text-lg font-semibold">
								Groundwork Tenant
							</Link>
						</div>
						<div className="flex items-center gap-1">
							{NAV_LINKS.map(({ href, label }) => {
								const active = href === "/tenant" ? pathname === href : pathname.startsWith(href);
								return (
									<Link
										key={href}
										href={href}
										className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
											active
												? "bg-accent font-medium text-accent-foreground"
												: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
										}`}
									>
										{label}
									</Link>
								);
							})}
						</div>
					</div>
					<div className="flex items-center gap-4">
						{session?.user && (
							<span className="text-sm text-muted-foreground">{session.user.name}</span>
						)}
						<Button asChild variant="ghost" size="sm">
							<Link href="/app">Switch Portal</Link>
						</Button>
						<Button variant="ghost" size="sm" onClick={handleSignOut}>
							<LogOut className="mr-2 h-4 w-4" />
							Sign out
						</Button>
					</div>
				</div>
			</nav>
			<main>{children}</main>
		</div>
	);
}
