import { TenantLayout } from "@/components/tenant/tenant-layout";

export default function TenantAppLayout({ children }: { children: React.ReactNode }) {
	return <TenantLayout>{children}</TenantLayout>;
}
