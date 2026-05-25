import type { Lead } from "@/lib/types";

export const mockLeads: Lead[] = [
  {
    id: "demo-1",
    created_at: new Date().toISOString(),
    company_name: "Norte Fit Studio",
    domain_root: "nortefit.com.br",
    city: "Sao Paulo",
    icp: "academia",
    ad_source: "meta",
    ad_active: true,
    contact_name: "Marina",
    contact_whatsapp: "+55 11 99999-0000",
    whatsapp_detected: true,
    pagespeed_mobile: 78,
    has_pixel: true,
    has_crm: true,
    crm_name: "HubSpot",
    fit_score: 45,
    timing_score: 46,
    total_score: 91,
    msg_whatsapp:
      "Oi Marina, vi que a Norte Fit esta com anuncio ativo e WhatsApp visivel. Tenho uma ideia simples para transformar essas conversas em mais alunos sem aumentar o time comercial.",
    msg_followup_d3: "Oi Marina, passando aqui de novo. Posso te mostrar em 10 minutos onde voces estao perdendo alunos no WhatsApp?",
    msg_followup_d7: "Ultima tentativa por aqui, Marina. Se fizer sentido, te mando um diagnostico rapido da captacao da Norte Fit.",
    audit_points: [
      {
        problem: "WhatsApp recebe trafego, mas nao ha triagem clara.",
        impact: "Leads quentes podem esfriar antes do primeiro atendimento.",
        recommendation: "Priorizar respostas por origem da campanha e intencao."
      }
    ],
    status: "awaiting_approval"
  },
  {
    id: "demo-2",
    created_at: new Date().toISOString(),
    company_name: "Clinica Aurora",
    domain_root: "clinicaaurora.com.br",
    city: "Campinas",
    icp: "clinica",
    ad_source: "google",
    whatsapp_detected: true,
    pagespeed_mobile: 63,
    has_pixel: false,
    has_crm: true,
    crm_name: "Pipedrive",
    fit_score: 42,
    timing_score: 42,
    total_score: 84,
    msg_whatsapp:
      "Oi, notei que a Clinica Aurora centraliza agendamentos no WhatsApp. Posso te mostrar um fluxo para responder mais rapido e separar pacientes com maior intencao?",
    status: "awaiting_approval"
  },
  {
    id: "demo-3",
    created_at: new Date().toISOString(),
    company_name: "Massa & Brasa",
    domain_root: "massaebrasa.com.br",
    city: "Rio de Janeiro",
    icp: "restaurante",
    ad_source: "meta",
    ad_active: true,
    whatsapp_detected: true,
    pagespeed_mobile: 52,
    has_pixel: true,
    has_crm: false,
    fit_score: 37,
    timing_score: 38,
    total_score: 75,
    msg_whatsapp:
      "Oi, vi que o Massa & Brasa usa WhatsApp para pedidos e tem campanhas ativas. Tenho uma abordagem para recuperar conversas paradas e medir retorno por canal.",
    status: "awaiting_approval"
  }
];
