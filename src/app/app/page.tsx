import { redirect } from "next/navigation";
import { getSessionPrincipal } from "@/lib/auth/principal";

export const dynamic = "force-dynamic";

export default async function AppEntryPage() {
	const principal = await getSessionPrincipal();
	if ("error" in principal) redirect("/login");

	if (principal.tenant && !principal.owner) {
		redirect("/tenant");
	}

	redirect("/dashboard");
}
