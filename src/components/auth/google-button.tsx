"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function GoogleButton() {
	const [loading, setLoading] = useState(false);

	const handleGoogleSignIn = async () => {
		setLoading(true);
		try {
			await authClient.signIn.social({
				provider: "google",
				callbackURL: "/dashboard",
			});
		} catch {
			setLoading(false);
		}
	};

	return (
		<Button
			type="button"
			variant="outline"
			className="w-full"
			onClick={handleGoogleSignIn}
			disabled={loading}
		>
			{loading ? "Redirecting..." : "Continue with Google"}
		</Button>
	);
}
