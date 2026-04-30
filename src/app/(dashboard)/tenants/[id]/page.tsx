import { TenantDetailClient } from "./tenant-detail-client";

interface Props {
	params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: Props) {
	const { id } = await params;
	return <TenantDetailClient tenantId={id} />;
}
