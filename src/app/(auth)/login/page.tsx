import Link from "next/link";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string }>;
}) {
	const { callbackUrl } = await searchParams;

	return (
		<Card>
			<CardHeader className="text-center">
				<CardTitle className="text-2xl">Welcome back</CardTitle>
				<CardDescription>Sign in to your account</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<GoogleButton />
				<div className="flex items-center gap-4">
					<Separator className="flex-1" />
					<span className="text-sm text-muted-foreground">or</span>
					<Separator className="flex-1" />
				</div>
				<LoginForm callbackUrl={callbackUrl ?? "/app"} />
				<p className="text-center text-sm text-muted-foreground">
					Don&apos;t have an account?{" "}
					<Link href="/signup" className="text-primary underline-offset-4 hover:underline">
						Sign up
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
