import type { ICP, Lead } from "@/lib/types";

type UnknownLead = Record<string, unknown>;

export type LeadFilters = {
  icp: string;
  minScore: number;
  city: string;
};

export function scoreValue(score: unknown) {
  const parsed = Number(score ?? 0);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

export function normalizeLead(raw: UnknownLead): Lead {
  const domain =
    readString(raw.domain_root) ??
    readString(raw.domain) ??
    readString(raw.website) ??
    "dominio-nao-informado.local";
  const fitScore = scoreValue(raw.fit_score);
  const timingScore = scoreValue(raw.timing_score);
  const totalScore = scoreValue(raw.total_score ?? fitScore + timingScore);

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    created_at: readString(raw.created_at) ?? new Date().toISOString(),
    company_name: readString(raw.company_name) ?? readString(raw.name) ?? "Lead sem nome",
    domain_root: domain.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
    city: readString(raw.city),
    icp: normalizeIcp(readString(raw.icp) ?? readString(raw.icp_type)),
    ad_source: readString(raw.ad_source),
    ad_url: readString(raw.ad_url),
    ad_active: readBoolean(raw.ad_active),
    contact_name: readString(raw.contact_name),
    contact_email: readString(raw.contact_email),
    contact_whatsapp: readString(raw.contact_whatsapp),
    whatsapp_detected: readBoolean(raw.whatsapp_detected ?? raw.has_whatsapp),
    pagespeed_mobile: readNumber(raw.pagespeed_mobile ?? raw.pagespeed_mobile_score),
    pagespeed_seo: readNumber(raw.pagespeed_seo),
    has_pixel: readBoolean(raw.has_pixel ?? raw.has_meta_pixel),
    has_crm: readBoolean(raw.has_crm ?? Boolean(raw.crm_name)),
    crm_name: readString(raw.crm_name),
    tech_stack: readRecord(raw.tech_stack),
    lp_markdown: readString(raw.lp_markdown),
    fit_score: fitScore,
    timing_score: timingScore,
    total_score: totalScore,
    audit_points: Array.isArray(raw.audit_points) ? raw.audit_points as Lead["audit_points"] : null,
    buying_moment_score: readNumber(raw.buying_moment_score),
    msg_whatsapp: readString(raw.msg_whatsapp) ?? readString(raw.whatsapp_message),
    msg_email_subject: readString(raw.msg_email_subject),
    msg_followup_d3: readString(raw.msg_followup_d3),
    msg_followup_d7: readString(raw.msg_followup_d7),
    prompt_version: readString(raw.prompt_version),
    status: readString(raw.status) ?? "awaiting_approval",
    rejection_reason: readString(raw.rejection_reason),
    outreach_sent_at: readString(raw.outreach_sent_at),
    outreach_channel: readString(raw.outreach_channel),
    response_type: readString(raw.response_type),
    objection: readString(raw.objection),
    meeting_scheduled: readBoolean(raw.meeting_scheduled),
    deal_value: readNumber(raw.deal_value)
  };
}

export function filterLeads(leads: Lead[], filters: LeadFilters) {
  const cityQuery = filters.city.trim().toLowerCase();

  return leads
    .filter((lead) => lead.status === "awaiting_approval")
    .filter((lead) => filters.icp === "all" || lead.icp === filters.icp)
    .filter((lead) => scoreValue(lead.total_score) >= filters.minScore)
    .filter((lead) => !cityQuery || lead.city?.toLowerCase().includes(cityQuery))
    .slice()
    .sort((a, b) => scoreValue(b.total_score) - scoreValue(a.total_score));
}

export function getUniqueIcps(leads: Lead[]) {
  return Array.from(new Set(leads.map((lead) => lead.icp).filter(Boolean))).sort() as ICP[];
}

export function calculateStats(leads: Lead[]) {
  const waiting = leads.filter((lead) => lead.status === "awaiting_approval").length;
  const today = new Date().toISOString().slice(0, 10);
  const approvedToday = leads.filter(
    (lead) => lead.status === "approved" && lead.created_at.slice(0, 10) === today
  ).length;
  const sent = leads.filter((lead) => Boolean(lead.outreach_sent_at) || lead.status === "approved").length;
  const responded = leads.filter(
    (lead) => lead.response_type && lead.response_type !== "no_response"
  ).length;
  const responseRate = sent === 0 ? 0 : Math.round((responded / sent) * 100);

  return {
    waiting,
    approvedToday,
    sent,
    responseRate
  };
}

function normalizeIcp(value: string | null): ICP {
  if (!value) return "outro";
  const normalized = value.toLowerCase().replace(/\s+/g, "_");
  const allowed = new Set([
    "clinica_estetica",
    "ecommerce",
    "consultoria_b2b",
    "curso_mentoria",
    "academia",
    "restaurante",
    "clinica",
    "outro"
  ]);

  return (allowed.has(normalized) ? normalized : "outro") as ICP;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
