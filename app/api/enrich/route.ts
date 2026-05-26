import { NextResponse } from "next/server";
import { notifyPipelineFailure } from "@/lib/alerts";
import { type ContactDiscoveryResult, discoverContact } from "@/lib/contact-discovery";
import { getMonthlyStackCostUsd } from "@/lib/costs";
import { collectEnrichmentSources, type EnrichmentSourcesResult } from "@/lib/enrichment-sources";
import { generateLeadWithGemini, type GeminiLeadResult } from "@/lib/gemini";
import { normalizeLead, scoreValue } from "@/lib/lead-helpers";
import { createServiceClient } from "@/lib/supabase";

type EnrichBody = {
  domain?: string;
  name?: string;
  icp?: string;
  city?: string;
  source?: string;
  ad_url?: string;
};

type LeadBuildInput = {
  domain: string;
  name: string;
  icp: string;
  city: string | null;
  source: string;
  adUrl: string | null;
};

const CRM_BY_ICP: Record<string, string> = {
  clinica_estetica: "RD Station",
  clinica: "Pipedrive",
  ecommerce: "HubSpot",
  consultoria_b2b: "HubSpot",
  curso_mentoria: "ActiveCampaign"
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as EnrichBody;
  const domain = normalizeDomain(body.domain);
  const name = body.name?.trim();
  const icp = body.icp?.trim() || "outro";
  const city = body.city?.trim() || null;
  const source = body.source?.trim() || "manual";
  const adUrl = body.ad_url?.trim() || null;

  if (!domain || !name) {
    return NextResponse.json({ error: "Dominio e nome da empresa sao obrigatorios." }, { status: 400 });
  }

  const input = { domain, name, icp, city, source, adUrl };
  const sources = await safeCollectSources(domain);
  const contact = await safeDiscoverContact(domain, sources.siteText);
  const gemini = await safeGenerateGemini(input, contact, sources);
  const lead = buildLead(input, contact, sources, gemini);
  const supabase = createServiceClient();

  if (!supabase) {
    return NextResponse.json({ lead, usingDemoData: true });
  }

  const existing = await supabase.from("leads").select("id").eq("domain_root", domain).maybeSingle();

  if (existing.data) {
    return NextResponse.json({ error: "Este dominio ja existe na base." }, { status: 409 });
  }

  const insertResult = await supabase
    .from("leads")
    .insert({
      name,
      domain,
      domain_root: domain,
      city,
      icp,
      source,
      ad_url: adUrl,
      status: "candidate"
    })
    .select("*")
    .single();

  if (!insertResult.data) {
    await notifyPipelineFailure({
      stage: "supabase_insert",
      domain,
      message: insertResult.error?.message ?? "Nao foi possivel criar lead.",
      error: insertResult.error
    });

    return NextResponse.json({ error: insertResult.error?.message ?? "Nao foi possivel criar lead." }, { status: 500 });
  }

  const updatePayload = {
    status: lead.status,
    lp_markdown: lead.lp_markdown,
    enrichment_sources: lead.enrichment_sources,
    whatsapp_detected: lead.whatsapp_detected,
    pagespeed_mobile_perf: lead.pagespeed_mobile,
    pagespeed_seo: lead.pagespeed_seo,
    pagespeed_raw: lead.pagespeed_raw,
    stack: sources.builtWith.technologies,
    crm_detected: lead.crm_name,
    builtwith_raw: lead.builtwith_raw,
    mx_records: lead.mx_records,
    email_provider: lead.email_provider,
    rdap_raw: lead.rdap_raw,
    domain_registered_at: lead.domain_registered_at,
    contact_email: lead.contact_email,
    contact_name: lead.contact_name,
    contact_whatsapp: lead.contact_whatsapp,
    contact_phone: lead.contact_phone,
    contact_instagram: lead.contact_instagram,
    contact_discovery_source: lead.contact_discovery_source,
    contact_discovery_status: lead.contact_discovery_status,
    fit_score: lead.fit_score,
    timing_score: lead.timing_score,
    buying_moment_score: lead.buying_moment_score,
    main_pain: gemini?.output.main_pain || null,
    angle: gemini?.output.angle || null,
    audit_points: lead.audit_points,
    whatsapp_lure: lead.msg_whatsapp,
    email_subject: lead.msg_email_subject,
    followup_d3: lead.msg_followup_d3,
    followup_d7: lead.msg_followup_d7,
    prompt_family: lead.prompt_family,
    prompt_version: lead.prompt_version,
    llm_model: lead.llm_model,
    llm_input_snapshot: lead.llm_input_snapshot,
    llm_output_raw: lead.llm_output_raw,
    monthly_cost_usd: getMonthlyStackCostUsd()
  };

  const updateResult = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", insertResult.data.id)
    .select("*")
    .single();

  if (updateResult.error) {
    await notifyPipelineFailure({
      stage: "supabase_update",
      domain,
      message: updateResult.error.message,
      error: updateResult.error
    });

    return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: normalizeLead(updateResult.data as Record<string, unknown>) });
}

function normalizeDomain(value: string | undefined) {
  return value?.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "") ?? "";
}

async function safeCollectSources(domain: string) {
  try {
    return await collectEnrichmentSources(domain);
  } catch (error) {
    await notifyPipelineFailure({
      stage: "enrichment_sources",
      domain,
      message: "Falha ao coletar fontes de enriquecimento.",
      error
    });

    return emptyEnrichmentSources();
  }
}

async function safeDiscoverContact(domain: string, siteText: string) {
  try {
    return await discoverContact(domain, siteText);
  } catch (error) {
    await notifyPipelineFailure({
      stage: "contact_discovery",
      domain,
      message: "Falha ao descobrir contato.",
      error
    });

    return emptyContactDiscovery();
  }
}

async function safeGenerateGemini(input: LeadBuildInput, contact: ContactDiscoveryResult, sources: EnrichmentSourcesResult) {
  try {
    return await generateLeadWithGemini({
      companyName: input.name,
      domain: input.domain,
      icp: input.icp,
      city: input.city,
      source: input.source,
      adUrl: input.adUrl,
      contact,
      sources
    });
  } catch (error) {
    await notifyPipelineFailure({
      stage: "gemini_enrichment",
      domain: input.domain,
      message: "Gemini falhou. Usando fallback deterministico.",
      error
    });

    return null;
  }
}

function buildLead(
  input: LeadBuildInput,
  contact: ContactDiscoveryResult,
  sources: EnrichmentSourcesResult,
  gemini: GeminiLeadResult | null
) {
  const hasAdSource = ["meta", "google", "linkedin"].includes(input.source);
  const hasPixel = sources.builtWith.hasPixel || hasAdSource;
  const fallbackFitScore = scoreValue(
    20 +
    (input.icp !== "outro" ? 15 : 0) +
    (contact.status === "found" ? 12 : 0) +
    (sources.builtWith.crm ? 8 : 0) +
    (sources.dns.emailProvider ? 5 : 0)
  );
  const fallbackTimingScore = scoreValue(
    18 +
    (hasAdSource ? 18 : 0) +
    (contact.contactWhatsapp ? 10 : 0) +
    (hasPixel ? 8 : 0) +
    (sources.pageSpeed.mobilePerformance !== null && sources.pageSpeed.mobilePerformance < 55 ? 8 : 0)
  );
  const fitScore = scoreValue(gemini?.output.fit_score ?? fallbackFitScore);
  const timingScore = scoreValue(gemini?.output.timing_score ?? fallbackTimingScore);
  const totalScore = scoreValue(fitScore + timingScore);
  const crmName = sources.builtWith.crm ?? CRM_BY_ICP[input.icp] ?? null;
  const whatsappMessage =
    gemini?.output.whatsapp_lure ||
    `Oi, vi a ${input.name} e encontrei um ponto simples para melhorar a captacao pelo site. Posso te mostrar em 10 minutos?`;

  return normalizeLead({
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    company_name: input.name,
    domain_root: input.domain,
    city: input.city,
    icp: input.icp,
    ad_source: input.source,
    ad_url: input.adUrl,
    ad_active: hasAdSource,
    whatsapp_detected: Boolean(contact.contactWhatsapp),
    pagespeed_mobile: sources.pageSpeed.mobilePerformance ?? 68,
    pagespeed_seo: sources.pageSpeed.seo ?? 82,
    pagespeed_raw: sources.pageSpeed.raw,
    has_pixel: hasPixel,
    has_crm: Boolean(crmName),
    crm_name: crmName,
    tech_stack: { items: sources.builtWith.technologies },
    builtwith_raw: sources.builtWith.raw,
    mx_records: sources.dns.mxRecords,
    email_provider: sources.dns.emailProvider,
    rdap_raw: sources.rdap.raw,
    domain_registered_at: sources.rdap.registeredAt,
    contact_name: contact.contactName,
    contact_email: contact.contactEmail,
    contact_whatsapp: contact.contactWhatsapp,
    contact_phone: contact.contactPhone,
    contact_instagram: contact.contactInstagram,
    contact_discovery_source: contact.source,
    contact_discovery_status: contact.status,
    lp_markdown: contact.siteText,
    enrichment_sources: {
      firecrawl: {
        status: sources.firecrawl.status,
        metadata: sources.firecrawl.metadata
      },
      pageSpeed: {
        status: sources.pageSpeed.status,
        mobilePerformance: sources.pageSpeed.mobilePerformance,
        seo: sources.pageSpeed.seo
      },
      builtWith: {
        status: sources.builtWith.status,
        technologies: sources.builtWith.technologies,
        crm: sources.builtWith.crm,
        hasPixel: sources.builtWith.hasPixel
      },
      dns: sources.dns,
      rdap: {
        status: sources.rdap.status,
        registeredAt: sources.rdap.registeredAt
      }
    },
    fit_score: fitScore,
    timing_score: timingScore,
    total_score: totalScore,
    buying_moment_score: scoreValue(gemini?.output.buying_moment_score ?? Math.max(1, Math.round(totalScore / 10))),
    audit_points: gemini?.output.audit_points?.length
      ? gemini.output.audit_points
      : [
          {
            problem: "Lead criado com enriquecimento parcial.",
            impact: "A abordagem pode ficar menos especifica ate revisar a landing page.",
            recommendation: "Validar site e contato antes de aprovar."
          }
        ],
    msg_whatsapp: whatsappMessage,
    msg_email_subject: gemini?.output.email_subject || `Diagnostico rapido da ${input.name}`,
    msg_followup_d3:
      gemini?.output.followup_d3 ||
      `Passando de novo sobre a ${input.name}. Posso te mostrar um ponto simples para melhorar conversao?`,
    msg_followup_d7:
      gemini?.output.followup_d7 ||
      `Ultima tentativa por aqui. Posso te enviar um ponto de auditoria da ${input.name} sem compromisso?`,
    prompt_family: gemini?.promptFamily ?? "lead_enrichment",
    prompt_version: gemini?.promptVersion ?? "deterministic_fallback_v1",
    llm_model: gemini?.model ?? "none",
    llm_input_snapshot: gemini?.inputSnapshot ?? {
      company_name: input.name,
      domain: input.domain,
      icp: input.icp,
      source: input.source,
      contact_discovery: {
        source: contact.source,
        status: contact.status
      }
    },
    llm_output_raw: gemini?.outputRaw ?? { fallback: true },
    monthly_cost_usd: getMonthlyStackCostUsd(),
    status: totalScore >= 65 ? "awaiting_approval" : "enriched"
  });
}

function emptyEnrichmentSources(): EnrichmentSourcesResult {
  return {
    siteText: "",
    firecrawl: {
      status: "error",
      markdown: "",
      metadata: null
    },
    pageSpeed: {
      status: "error",
      mobilePerformance: null,
      seo: null,
      raw: null
    },
    builtWith: {
      status: "error",
      technologies: [],
      crm: null,
      hasPixel: false,
      raw: null
    },
    dns: {
      status: "error",
      mxRecords: [],
      emailProvider: null
    },
    rdap: {
      status: "error",
      registeredAt: null,
      raw: null
    }
  };
}

function emptyContactDiscovery(): ContactDiscoveryResult {
  return {
    source: "none",
    status: "error",
    contactName: null,
    contactEmail: null,
    contactWhatsapp: null,
    contactPhone: null,
    contactInstagram: null,
    siteText: "",
    notes: ["Falha ao executar descoberta de contato."]
  };
}
