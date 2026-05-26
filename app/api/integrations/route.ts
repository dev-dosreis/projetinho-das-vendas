import { NextResponse } from "next/server";
import { getIntegrationHealth } from "@/lib/integration-health";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const live = url.searchParams.get("live") === "1";

  return NextResponse.json(await getIntegrationHealth({ live }));
}
