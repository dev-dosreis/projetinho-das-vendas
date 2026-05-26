import ApiStatusClient from "@/components/api-status-client";
import { getIntegrationHealth } from "@/lib/integration-health";

export const dynamic = "force-dynamic";

export default async function ApisPage() {
  const health = await getIntegrationHealth();

  return <ApiStatusClient initialHealth={health} />;
}
