import SentLeadsClient from "@/components/sent-leads-client";
import { getMonthlyStackCostUsd } from "@/lib/costs";
import { fetchLeads } from "@/lib/lead-data";

export const dynamic = "force-dynamic";

export default async function EnviadosPage() {
  const { leads, usingDemoData, error } = await fetchLeads();

  return (
    <SentLeadsClient
      initialLeads={leads}
      usingDemoData={usingDemoData}
      dataError={error}
      monthlyCostUsd={getMonthlyStackCostUsd()}
    />
  );
}
