export type ICP = "clinica_estetica" | "ecommerce" | "consultoria_b2b" | "curso_mentoria" | "academia" | "restaurante" | "clinica" | "outro";

export type LeadStatus =
  | "candidate"
  | "enriched"
  | "awaiting_approval"
  | "approved"
  | "sent"
  | "rejected"
  | "snoozed"
  | "postponed";

export type ResponseType = "waiting" | "positive" | "neutral" | "negative" | "no_response";

export type AdSource = "meta" | "google" | "tiktok" | "manual";

export interface Lead {
  id: string;
  created_at: string;
  company_name: string;
  domain_root: string;
  city?: string | null;
  icp?: ICP | null;
  ad_source?: AdSource | string | null;
  ad_url?: string | null;
  ad_active?: boolean | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_whatsapp?: string | null;
  whatsapp_detected?: boolean | null;
  pagespeed_mobile?: number | null;
  pagespeed_seo?: number | null;
  has_pixel?: boolean | null;
  has_crm?: boolean | null;
  crm_name?: string | null;
  tech_stack?: Record<string, unknown> | null;
  lp_markdown?: string | null;
  fit_score: number;
  timing_score: number;
  total_score: number;
  audit_points?: AuditPoint[] | null;
  buying_moment_score?: number | null;
  msg_whatsapp?: string | null;
  msg_email_subject?: string | null;
  msg_followup_d3?: string | null;
  msg_followup_d7?: string | null;
  prompt_version?: string | null;
  status: LeadStatus | string;
  rejection_reason?: string | null;
  snoozed_until?: string | null;
  outreach_sent_at?: string | null;
  outreach_channel?: string | null;
  response_type?: ResponseType | string | null;
  objection?: string | null;
  followup_d3_sent?: boolean | null;
  followup_d7_sent?: boolean | null;
  meeting_scheduled?: boolean | null;
  deal_value?: number | null;
}

export interface AuditPoint {
  problem: string;
  impact: string;
  recommendation: string;
}

export const ICP_LABELS: Record<ICP, string> = {
  clinica_estetica: "Clinica",
  ecommerce: "E-commerce",
  consultoria_b2b: "Consultoria B2B",
  curso_mentoria: "Curso/Mentoria",
  academia: "Academia",
  restaurante: "Restaurante",
  clinica: "Clinica",
  outro: "Outro"
};

export const ICP_COLORS: Record<ICP, string> = {
  clinica_estetica: "bg-white/70 text-slate-700 border-slate-200",
  ecommerce: "bg-white/70 text-slate-700 border-slate-200",
  consultoria_b2b: "bg-white/70 text-slate-700 border-slate-200",
  curso_mentoria: "bg-white/70 text-slate-700 border-slate-200",
  academia: "bg-white/70 text-slate-700 border-slate-200",
  restaurante: "bg-white/70 text-slate-700 border-slate-200",
  clinica: "bg-white/70 text-slate-700 border-slate-200",
  outro: "bg-white/70 text-slate-700 border-slate-200"
};

export const STATUS_LABELS: Record<string, string> = {
  candidate: "Candidato",
  enriched: "Enriquecido",
  awaiting_approval: "Aguardando",
  approved: "Aprovado",
  sent: "Enviado",
  rejected: "Rejeitado",
  snoozed: "Adiado",
  postponed: "Adiado"
};
