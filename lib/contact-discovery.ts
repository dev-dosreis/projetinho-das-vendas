import "server-only";

type ContactSource = "site" | "instagram" | "apollo" | "hunter" | "none";
type ContactStatus = "found" | "not_found" | "not_configured" | "error";

export type ContactDiscoveryResult = {
  source: ContactSource;
  status: ContactStatus;
  contactName: string | null;
  contactEmail: string | null;
  contactWhatsapp: string | null;
  contactPhone: string | null;
  contactInstagram: string | null;
  siteText: string;
  notes: string[];
};

const COMMON_DECISION_TITLES = [
  "owner",
  "founder",
  "ceo",
  "diretor",
  "diretora",
  "socio",
  "socia",
  "marketing",
  "growth",
  "comercial"
];

export async function discoverContact(domain: string, knownSiteText = ""): Promise<ContactDiscoveryResult> {
  const siteText = knownSiteText || await fetchSiteText(domain);
  const siteContact = extractSiteContact(siteText);

  if (siteContact.contactEmail || siteContact.contactWhatsapp || siteContact.contactPhone || siteContact.contactInstagram) {
    return {
      source: siteContact.contactInstagram && !siteContact.contactEmail && !siteContact.contactWhatsapp ? "instagram" : "site",
      status: "found",
      contactName: null,
      siteText,
      notes: ["Contato encontrado no proprio site."],
      ...siteContact
    };
  }

  const apollo = await searchApollo(domain);
  if (apollo.status === "found") {
    return { ...apollo, siteText, notes: ["Contato/decisor encontrado via Apollo."] };
  }

  const hunter = await searchHunter(domain);
  if (hunter.status === "found") {
    return { ...hunter, siteText, notes: ["E-mail encontrado via Hunter."] };
  }

  return {
    source: "none",
    status: apollo.status === "error" || hunter.status === "error" ? "error" : "not_found",
    contactName: null,
    contactEmail: null,
    contactWhatsapp: null,
    contactPhone: null,
    contactInstagram: null,
    siteText,
    notes: ["Nenhum contato encontrado nos fallbacks configurados."]
  };
}

async function fetchSiteText(domain: string) {
  const urls = [`https://${domain}`, `http://${domain}`];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 LeadEngine/0.1"
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) continue;

      const text = await response.text();
      return compactText(text).slice(0, 12000);
    } catch {
      // Fallback to the next protocol.
    }
  }

  return "";
}

function extractSiteContact(text: string) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const whatsappLink = text.match(/(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)[^\s"'<>]+/i)?.[0] ?? null;
  const instagram = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/[A-Za-z0-9._-]+/i)?.[0] ?? null;
  const phone = text.match(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-\s]?\d{4}/)?.[0] ?? null;

  return {
    contactEmail: email,
    contactWhatsapp: whatsappLink ?? normalizeWhatsappFromPhone(phone),
    contactPhone: phone,
    contactInstagram: instagram
  };
}

async function searchApollo(domain: string): Promise<Omit<ContactDiscoveryResult, "siteText" | "notes">> {
  const apiKey =
    process.env.APOLLO_API_KEY ??
    process.env.APOLLO_COMPANY_SEARCH_API_KEY ??
    process.env.APOLLO_ORGANIZATION_ENRICH_API_KEY;
  if (!apiKey) return emptyDiscovery("apollo", "not_configured");

  try {
    const url = new URL("https://api.apollo.io/api/v1/mixed_people/api_search");
    url.searchParams.append("q_organization_domains_list[]", domain);
    COMMON_DECISION_TITLES.forEach((title) => url.searchParams.append("person_titles[]", title));
    url.searchParams.append("page", "1");
    url.searchParams.append("per_page", "3");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({})
    });

    if (!response.ok) return emptyDiscovery("apollo", "error");

    const json = await response.json() as ApolloSearchResponse;
    const person = json.people?.find((item) => item.first_name || item.name) ?? json.people?.[0];

    if (!person) return emptyDiscovery("apollo", "not_found");

    return {
      source: "apollo",
      status: "found",
      contactName: person.name ?? ([person.first_name, person.last_name].filter(Boolean).join(" ") || null),
      contactEmail: person.email ?? null,
      contactWhatsapp: person.phone_numbers?.[0]?.raw_number ?? null,
      contactPhone: person.phone_numbers?.[0]?.raw_number ?? null,
      contactInstagram: null
    };
  } catch {
    return emptyDiscovery("apollo", "error");
  }
}

async function searchHunter(domain: string): Promise<Omit<ContactDiscoveryResult, "siteText" | "notes">> {
  const apiKey = process.env.HUNTER_API_KEY ?? process.env.HUNTER_KEY;
  if (!apiKey) return emptyDiscovery("hunter", "not_configured");

  try {
    const url = new URL("https://api.hunter.io/v2/domain-search");
    url.searchParams.set("domain", domain);
    url.searchParams.set("limit", "5");
    url.searchParams.set("api_key", apiKey);

    const response = await fetch(url);
    if (!response.ok) return emptyDiscovery("hunter", "error");

    const json = await response.json() as HunterDomainSearchResponse;
    const email = json.data?.emails?.find((item) => item.value)?.value ?? null;

    if (!email) return emptyDiscovery("hunter", "not_found");

    return {
      source: "hunter",
      status: "found",
      contactName: null,
      contactEmail: email,
      contactWhatsapp: null,
      contactPhone: null,
      contactInstagram: null
    };
  } catch {
    return emptyDiscovery("hunter", "error");
  }
}

function emptyDiscovery(source: ContactSource, status: ContactStatus): Omit<ContactDiscoveryResult, "siteText" | "notes"> {
  return {
    source,
    status,
    contactName: null,
    contactEmail: null,
    contactWhatsapp: null,
    contactPhone: null,
    contactInstagram: null
  };
}

function normalizeWhatsappFromPhone(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}` : null;
}

function compactText(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ApolloSearchResponse = {
  people?: Array<{
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_numbers?: Array<{ raw_number?: string }>;
  }>;
};

type HunterDomainSearchResponse = {
  data?: {
    emails?: Array<{ value?: string }>;
  };
};
