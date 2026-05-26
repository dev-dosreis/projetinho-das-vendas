import "server-only";
import type { ContactDiscoveryResult } from "@/lib/contact-discovery";
import type { EnrichmentSourcesResult } from "@/lib/enrichment-sources";

export type GeminiLeadInput = {
  companyName: string;
  domain: string;
  icp: string;
  city: string | null;
  source: string;
  adUrl: string | null;
  contact: ContactDiscoveryResult;
  sources?: EnrichmentSourcesResult;
};

export type GeminiLeadResult = {
  promptFamily: string;
  promptVersion: string;
  model: string;
  inputSnapshot: Record<string, unknown>;
  outputRaw: Record<string, unknown>;
  output: GeminiLeadOutput;
};

type GeminiLeadOutput = {
  fit_score?: number;
  timing_score?: number;
  buying_moment_score?: number;
  main_pain?: string;
  angle?: string;
  audit_points?: Array<{
    problem: string;
    impact: string;
    recommendation: string;
  }>;
  whatsapp_lure?: string;
  email_subject?: string;
  followup_d3?: string;
  followup_d7?: string;
};

const PROMPT_FAMILY = "lead_enrichment";
const PROMPT_VERSION = "lead_enrichment_gemini_flash_v1";

export async function generateLeadWithGemini(input: GeminiLeadInput): Promise<GeminiLeadResult | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GEMINI_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const inputSnapshot = buildInputSnapshot(input);
  const prompt = buildPrompt(inputSnapshot);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json"
      }
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    throw new Error(`Gemini retornou HTTP ${response.status}`);
  }

  const outputRaw = await response.json() as Record<string, unknown>;
  const text = extractGeminiText(outputRaw);
  const output = parseJsonOutput(text);

  return {
    promptFamily: PROMPT_FAMILY,
    promptVersion: PROMPT_VERSION,
    model,
    inputSnapshot,
    outputRaw,
    output
  };
}

function buildInputSnapshot(input: GeminiLeadInput) {
  return {
    company_name: input.companyName,
    domain: input.domain,
    icp: input.icp,
    city: input.city,
    source: input.source,
    ad_url: input.adUrl,
    contact_discovery: {
      source: input.contact.source,
      status: input.contact.status,
      contact_name: input.contact.contactName,
      contact_email: input.contact.contactEmail,
      contact_whatsapp: input.contact.contactWhatsapp,
      contact_instagram: input.contact.contactInstagram,
      notes: input.contact.notes
    },
    enrichment: input.sources ? {
      pagespeed_mobile: input.sources.pageSpeed.mobilePerformance,
      pagespeed_seo: input.sources.pageSpeed.seo,
      technologies: input.sources.builtWith.technologies.slice(0, 20),
      crm: input.sources.builtWith.crm,
      has_pixel: input.sources.builtWith.hasPixel,
      email_provider: input.sources.dns.emailProvider,
      domain_registered_at: input.sources.rdap.registeredAt
    } : null,
    site_text_excerpt: input.contact.siteText.slice(0, 6000)
  };
}

function buildPrompt(inputSnapshot: Record<string, unknown>) {
  return `
Voce e um analista de prospeccao B2B para leads brasileiros.
Analise os dados abaixo e retorne somente JSON valido, sem markdown.

Objetivo:
- Calcular fit_score de 0 a 100.
- Calcular timing_score de 0 a 100.
- Gerar uma mensagem curta de WhatsApp, clara e humana.
- Criar follow-ups D+3 e D+7.
- Evitar promessas exageradas.
- Linguagem simples, direta, sem jargoes.

Formato obrigatorio:
{
  "fit_score": 0,
  "timing_score": 0,
  "buying_moment_score": 0,
  "main_pain": "",
  "angle": "",
  "audit_points": [
    {
      "problem": "",
      "impact": "",
      "recommendation": ""
    }
  ],
  "whatsapp_lure": "",
  "email_subject": "",
  "followup_d3": "",
  "followup_d7": ""
}

Dados:
${JSON.stringify(inputSnapshot, null, 2)}
`;
}

function extractGeminiText(raw: Record<string, unknown>) {
  const candidates = raw.candidates;
  if (!Array.isArray(candidates)) return "{}";

  const first = candidates[0] as Record<string, unknown> | undefined;
  const content = first?.content as Record<string, unknown> | undefined;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return "{}";

  return parts
    .map((part) => typeof (part as Record<string, unknown>).text === "string" ? (part as Record<string, string>).text : "")
    .join("")
    .trim();
}

function parseJsonOutput(text: string): GeminiLeadOutput {
  const cleanText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleanText) as GeminiLeadOutput;

  return {
    fit_score: clampScore(parsed.fit_score),
    timing_score: clampScore(parsed.timing_score),
    buying_moment_score: clampScore(parsed.buying_moment_score),
    main_pain: stringValue(parsed.main_pain),
    angle: stringValue(parsed.angle),
    audit_points: Array.isArray(parsed.audit_points) ? parsed.audit_points.slice(0, 3) : [],
    whatsapp_lure: stringValue(parsed.whatsapp_lure),
    email_subject: stringValue(parsed.email_subject),
    followup_d3: stringValue(parsed.followup_d3),
    followup_d7: stringValue(parsed.followup_d7)
  };
}

function clampScore(value: unknown) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
