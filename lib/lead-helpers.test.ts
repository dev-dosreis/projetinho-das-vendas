import { describe, expect, it } from "vitest";
import { calculateStats, filterLeads, normalizeLead } from "./lead-helpers";

describe("lead helpers", () => {
  it("normalizes legacy lead columns into the Claude lead shape", () => {
    const lead = normalizeLead({
      id: "1",
      company_name: "Clinica Aurora",
      domain: "https://clinicaaurora.com.br/",
      icp_type: "clinica",
      has_whatsapp: true,
      has_meta_pixel: true,
      pagespeed_mobile_score: 63,
      whatsapp_message: "Oi",
      fit_score: 42,
      timing_score: 42,
      total_score: 84,
      status: "awaiting_approval"
    });

    expect(lead.domain_root).toBe("clinicaaurora.com.br");
    expect(lead.icp).toBe("clinica");
    expect(lead.whatsapp_detected).toBe(true);
    expect(lead.has_pixel).toBe(true);
    expect(lead.pagespeed_mobile).toBe(63);
    expect(lead.msg_whatsapp).toBe("Oi");
  });

  it("filters awaiting leads and sorts by total score", () => {
    const leads = [
      normalizeLead({ id: "1", company_name: "A", domain_root: "a.com", city: "Sao Paulo", status: "awaiting_approval", total_score: 70 }),
      normalizeLead({ id: "2", company_name: "B", domain_root: "b.com", city: "Campinas", status: "awaiting_approval", total_score: 90 }),
      normalizeLead({ id: "3", company_name: "C", domain_root: "c.com", city: "Campinas", status: "approved", total_score: 99 })
    ];

    expect(filterLeads(leads, { icp: "all", minScore: 80, city: "camp" }).map((lead) => lead.id)).toEqual(["2"]);
  });

  it("calculates the bandeja stats", () => {
    const stats = calculateStats([
      normalizeLead({ id: "1", company_name: "A", domain_root: "a.com", status: "awaiting_approval" }),
      normalizeLead({ id: "2", company_name: "B", domain_root: "b.com", status: "approved", outreach_sent_at: "2026-05-25T12:00:00.000Z", response_type: "positive" })
    ]);

    expect(stats.waiting).toBe(1);
    expect(stats.approvedToday).toBeGreaterThanOrEqual(0);
    expect(stats.sent).toBe(1);
    expect(stats.responseRate).toBe(100);
  });
});
