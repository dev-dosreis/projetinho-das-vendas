import "server-only";
import dns from "node:dns/promises";

export type EnrichmentSourcesResult = {
  siteText: string;
  firecrawl: {
    status: "ok" | "not_configured" | "error";
    markdown: string;
    metadata: Record<string, unknown> | null;
  };
  pageSpeed: {
    status: "ok" | "not_configured" | "error";
    mobilePerformance: number | null;
    seo: number | null;
    raw: Record<string, unknown> | null;
  };
  builtWith: {
    status: "ok" | "not_configured" | "error";
    technologies: string[];
    crm: string | null;
    hasPixel: boolean;
    raw: Record<string, unknown> | null;
  };
  dns: {
    status: "ok" | "error";
    mxRecords: Array<{ exchange: string; priority: number }>;
    emailProvider: string | null;
  };
  rdap: {
    status: "ok" | "error";
    registeredAt: string | null;
    raw: Record<string, unknown> | null;
  };
};

const CRM_NAMES = ["HubSpot", "RD Station", "Pipedrive", "Salesforce", "ActiveCampaign", "Zoho", "Kommo"];
const PIXEL_NEEDLES = ["meta pixel", "facebook pixel", "facebook conversion", "google tag manager", "google analytics"];

export async function collectEnrichmentSources(domain: string): Promise<EnrichmentSourcesResult> {
  const [firecrawl, pageSpeed, builtWith, dnsResult, rdap] = await Promise.all([
    scrapeWithFirecrawl(domain),
    fetchPageSpeed(domain),
    fetchBuiltWith(domain),
    resolveDns(domain),
    fetchRdap(domain)
  ]);

  return {
    siteText: firecrawl.markdown,
    firecrawl,
    pageSpeed,
    builtWith,
    dns: dnsResult,
    rdap
  };
}

async function scrapeWithFirecrawl(domain: string): Promise<EnrichmentSourcesResult["firecrawl"]> {
  const apiKey = process.env.FIRECRAWL_API_KEY ?? process.env.FIRECRAWL_KEY;
  if (!apiKey) return { status: "not_configured", markdown: "", metadata: null };

  try {
    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: `https://${domain}`,
        formats: ["markdown"],
        onlyMainContent: true,
        removeBase64Images: true,
        blockAds: true,
        timeout: 30000
      }),
      signal: AbortSignal.timeout(35000)
    });

    if (!response.ok) return { status: "error", markdown: "", metadata: null };

    const json = await response.json() as FirecrawlResponse;
    const data = (recordValue(json.data) ?? json) as Record<string, unknown>;
    const markdown = stringValue(data.markdown) || stringValue(json.markdown);

    return {
      status: markdown ? "ok" : "error",
      markdown: markdown.slice(0, 20000),
      metadata: recordValue(data.metadata)
    };
  } catch {
    return { status: "error", markdown: "", metadata: null };
  }
}

async function fetchPageSpeed(domain: string): Promise<EnrichmentSourcesResult["pageSpeed"]> {
  const apiKey = process.env.PAGESPEED_API_KEY ?? process.env.PSI_KEY;
  if (!apiKey) return { status: "not_configured", mobilePerformance: null, seo: null, raw: null };

  try {
    const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    url.searchParams.set("url", `https://${domain}`);
    url.searchParams.set("strategy", "mobile");
    url.searchParams.append("category", "performance");
    url.searchParams.append("category", "seo");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
    if (!response.ok) return { status: "error", mobilePerformance: null, seo: null, raw: null };

    const raw = await response.json() as Record<string, unknown>;
    const categories = (raw.lighthouseResult as Record<string, unknown> | undefined)?.categories as Record<string, unknown> | undefined;
    const performance = readCategoryScore(categories?.performance);
    const seo = readCategoryScore(categories?.seo);

    return {
      status: "ok",
      mobilePerformance: performance,
      seo,
      raw: slimPageSpeedRaw(raw)
    };
  } catch {
    return { status: "error", mobilePerformance: null, seo: null, raw: null };
  }
}

async function fetchBuiltWith(domain: string): Promise<EnrichmentSourcesResult["builtWith"]> {
  const apiKey = process.env.BUILTWITH_API_KEY ?? process.env.BUILTWITH_KEY;
  if (!apiKey) return { status: "not_configured", technologies: [], crm: null, hasPixel: false, raw: null };

  try {
    const url = new URL("https://api.builtwith.com/v22/api.json");
    url.searchParams.set("KEY", apiKey);
    url.searchParams.set("LOOKUP", domain);

    const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!response.ok) return { status: "error", technologies: [], crm: null, hasPixel: false, raw: null };

    const raw = await response.json() as Record<string, unknown>;
    const technologies = extractTechnologyNames(raw).slice(0, 40);
    const crm = technologies.find((name) => CRM_NAMES.some((crmName) => name.toLowerCase().includes(crmName.toLowerCase()))) ?? null;
    const hasPixel = technologies.some((name) => PIXEL_NEEDLES.some((needle) => name.toLowerCase().includes(needle)));

    return {
      status: "ok",
      technologies,
      crm,
      hasPixel,
      raw: {
        technologies,
        first_lookup: raw.FirstIndexed,
        last_lookup: raw.LastIndexed
      }
    };
  } catch {
    return { status: "error", technologies: [], crm: null, hasPixel: false, raw: null };
  }
}

async function resolveDns(domain: string): Promise<EnrichmentSourcesResult["dns"]> {
  try {
    const mxRecords = await dns.resolveMx(domain);

    return {
      status: "ok",
      mxRecords,
      emailProvider: detectEmailProvider(mxRecords.map((record) => record.exchange))
    };
  } catch {
    return { status: "error", mxRecords: [], emailProvider: null };
  }
}

async function fetchRdap(domain: string): Promise<EnrichmentSourcesResult["rdap"]> {
  try {
    const baseUrl = process.env.RDAP_BASE_URL ?? (domain.endsWith(".br") ? "https://rdap.registro.br" : "https://rdap.org");
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/domain/${domain}`, {
      headers: { Accept: "application/rdap+json, application/json" },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) return { status: "error", registeredAt: null, raw: null };

    const raw = await response.json() as RdapResponse;
    return {
      status: "ok",
      registeredAt: findRegistrationDate(raw),
      raw: {
        handle: raw.handle,
        ldhName: raw.ldhName,
        events: raw.events,
        status: raw.status
      }
    };
  } catch {
    return { status: "error", registeredAt: null, raw: null };
  }
}

function readCategoryScore(category: unknown) {
  const score = Number((category as Record<string, unknown> | undefined)?.score);
  return Number.isFinite(score) ? Math.round(score * 100) : null;
}

function slimPageSpeedRaw(raw: Record<string, unknown>) {
  const categories = (raw.lighthouseResult as Record<string, unknown> | undefined)?.categories;
  return { categories };
}

function extractTechnologyNames(value: unknown, names = new Set<string>()): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    value.forEach((item) => extractTechnologyNames(item, names));
    return Array.from(names);
  }

  if (typeof value !== "object") return Array.from(names);

  const record = value as Record<string, unknown>;
  const name = stringValue(record.Name) || stringValue(record.name) || stringValue(record.Tag) || stringValue(record.tag);
  if (name && name.length <= 80) names.add(name);

  Object.values(record).forEach((item) => extractTechnologyNames(item, names));
  return Array.from(names);
}

function detectEmailProvider(exchanges: string[]) {
  const value = exchanges.join(" ").toLowerCase();
  if (value.includes("google") || value.includes("googlemail")) return "Google Workspace";
  if (value.includes("outlook") || value.includes("protection.outlook") || value.includes("office365")) return "Microsoft 365";
  if (value.includes("zoho")) return "Zoho Mail";
  if (value.includes("locaweb")) return "Locaweb";
  if (value.includes("uolhost")) return "UOL Host";
  if (value.includes("hostgator")) return "HostGator";
  return exchanges[0] ?? null;
}

function findRegistrationDate(raw: RdapResponse) {
  const event = raw.events?.find((item) => {
    const action = item.eventAction?.toLowerCase() ?? "";
    return action.includes("registration") || action.includes("registered");
  });

  return event?.eventDate ?? null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function recordValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

type FirecrawlResponse = {
  markdown?: string;
  data?: {
    markdown?: string;
    metadata?: Record<string, unknown>;
  };
};

type RdapResponse = {
  handle?: string;
  ldhName?: string;
  events?: Array<{
    eventAction?: string;
    eventDate?: string;
  }>;
  status?: string[];
};
