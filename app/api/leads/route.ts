import { NextResponse } from "next/server";
import { fetchLeads } from "@/lib/lead-data";

export async function GET() {
  const result = await fetchLeads();
  return NextResponse.json(result);
}
