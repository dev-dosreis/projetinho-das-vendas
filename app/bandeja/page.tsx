import BandejaClient from "@/components/bandeja-client";
import { fetchLeads } from "@/lib/lead-data";

export const dynamic = "force-dynamic";

export default async function BandejaPage() {
  const { leads, usingDemoData, error } = await fetchLeads();

  return <BandejaClient initialLeads={leads} usingDemoData={usingDemoData} dataError={error} />;
}
