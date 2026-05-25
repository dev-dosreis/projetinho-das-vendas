import { unstable_noStore as noStore } from "next/cache";
import { normalizeLead } from "@/lib/lead-helpers";
import { mockLeads } from "@/lib/mock-data";
import { createReadClient } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

export async function fetchLeads(): Promise<{ leads: Lead[]; usingDemoData: boolean; error?: string }> {
  noStore();

  const client = createReadClient();

  if (!client) {
    return {
      leads: mockLeads,
      usingDemoData: true,
      error: "Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no servidor para usar dados reais."
    };
  }

  const { data, error } = await client
    .from("leads")
    .select("*")
    .order("total_score", { ascending: false });

  if (error) {
    return {
      leads: mockLeads,
      usingDemoData: true,
      error: error.message
    };
  }

  return {
    leads: (data ?? []).map((lead) => normalizeLead(lead as Record<string, unknown>)),
    usingDemoData: false
  };
}
