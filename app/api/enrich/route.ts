import { NextResponse } from "next/server";
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

  const lead = buildLead({ domain, name, icp, city, source, adUrl });
  const supabase = createServiceClient();

  if (!supabase) {
    return NextResponse.json({ lead, usingDemoData: true });
  }

  const existing = await supabase.from("leads").select("*").eq("domain_root", domain).maybeSingle();

  if (existing.data) {
    return NextResponse.json({ error: "Este dominio ja existe na base." }, { status: 409 });
  }

  const insertResult =
    await supabase
      .from("leads")
      .insert({
        name,
        domain,
        city,
        icp,
        source,
        ad_url: adUrl,
        status: "candidate"
      })
      .select("*")
      .single();

  const inserted =
    insertResult.data ??
    (await supabase
      .from("leads")
      .insert({
        company_name: name,
        domain_root: domain,
        city,
        icp,
        ad_source: source,
        ad_url: adUrl,
        status: "candidate"
      })
      .select("*")
      .single()).data;

  if (!inserted && insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  const id = String((inserted as Record<string, unknown> | null)?.id ?? lead.id);
  const updateResult =
    await supabase
      .from("leads")
      .update({
        status: lead.total_score >= 65 ? "awaiting_approval" : "enriched",
        lp_markdown: lead.lp_markdown,
        whatsapp_detected: lead.whatsapp_detected,
        pagespeed_mobile_perf: lead.pagespeed_mobile,
        pagespeed_seo: lead.pagespeed_seo,
        stack: ["Meta Pixel", lead.crm_name].filter(Boolean),
        crm_detected: lead.crm_name,
        contact_email: lead.contact_email,
        contact_name: lead.contact_name,
        fit_score: lead.fit_score,
        timing_score: lead.timing_score,
        buying_moment_score: lead.buying_moment_score,
        audit_points: lead.audit_points,
        whatsapp_lure: lead.msg_whatsapp,
        email_subject: lead.msg_email_subject,
        followup_d3: lead.msg_followup_d3,
        followup_d7: lead.msg_followup_d7
      })
      .eq("id", id)
      .select("*")
      .single();

  const legacyUpdate =
    updateResult.data ??
    (await supabase
      .from("leads")
      .update({
        status: lead.status,
        lp_markdown: lead.lp_markdown,
        whatsapp_detected: lead.whatsapp_detected,
        pagespeed_mobile: lead.pagespeed_mobile,
        pagespeed_seo: lead.pagespeed_seo,
        has_pixel: lead.has_pixel,
        has_crm: lead.has_crm,
        crm_name: lead.crm_name,
        contact_email: lead.contact_email,
        contact_name: lead.contact_name,
        fit_score: lead.fit_score,
        timing_score: lead.timing_score,
        total_score: lead.total_score,
        buying_moment_score: lead.buying_moment_score,
        audit_points: lead.audit_points,
        msg_whatsapp: lead.msg_whatsapp,
        msg_email_subject: lead.msg_email_subject,
        msg_followup_d3: lead.msg_followup_d3,
        msg_followup_d7: lead.msg_followup_d7
      })
      .eq("id", id)
      .select("*")
      .single()).data;

  return NextResponse.json({ lead: normalizeLead((legacyUpdate ?? lead) as Record<string, unknown>) });
}

function normalizeDomain(value: string | undefined) {
  return value?.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "") ?? "";
}

function buildLead(input: { domain: string; name: string; icp: string; city: string | null; source: string; adUrl: string | null }) {
  const hasAdSource = ["meta", "google", "linkedin"].includes(input.source);
  const fitScore = scoreValue(20 + (input.icp !== "outro" ? 15 : 0) + (hasAdSource ? 10 : 0));
  const timingScore = scoreValue(18 + (hasAdSource ? 12 : 0) + 12);
  const totalScore = scoreValue(fitScore + timingScore);
  const crmName = CRM_BY_ICP[input.icp] ?? null;

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
    whatsapp_detected: true,
    pagespeed_mobile: 68,
    pagespeed_seo: 82,
    has_pixel: hasAdSource,
    has_crm: Boolean(crmName),
    crm_name: crmName,
    contact_name: null,
    contact_email: null,
    fit_score: fitScore,
    timing_score: timingScore,
    total_score: totalScore,
    buying_moment_score: Math.max(1, Math.round(totalScore / 10)),
    audit_points: [
      {
        problem: "Lead criado sem auditoria profunda ainda.",
        impact: "A abordagem pode ficar menos especifica ate o enriquecimento completo.",
        recommendation: "Revisar a landing page antes de aprovar o contato."
      }
    ],
    msg_whatsapp: `Oi, vi a ${input.name} e acredito que existe espaco para melhorar a captura de leads pelo site. Posso te mostrar um diagnostico rapido do que eu encontrei?`,
    msg_email_subject: `Diagnostico rapido da ${input.name}`,
    msg_followup_d3: `Passando de novo sobre a ${input.name}. Posso te mostrar um ponto simples para melhorar conversao sem mexer no time?`,
    msg_followup_d7: `Ultima tentativa por aqui. Posso te enviar um ponto de auditoria da ${input.name} sem compromisso?`,
    status: totalScore >= 65 ? "awaiting_approval" : "enriched"
  });
}
