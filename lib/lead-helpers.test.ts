import { describe, expect, it } from "vitest";
import { calculateSentStats, calculateStats, filterLeads, normalizeLead } from "./lead-helpers";

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
      snoozed_until: "2026-06-01T12:00:00.000Z",
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
    expect(lead.snoozed_until).toBe("2026-06-01T12:00:00.000Z");
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
      normalizeLead({ id: "1", company_name: "A", domain_root: "a.com", status: "awaiting_approval", total_score: 80 }),
      normalizeLead({ id: "3", company_name: "C", domain_root: "c.com", status: "awaiting_approval", total_score: 60 }),
      normalizeLead({ id: "2", company_name: "B", domain_root: "b.com", status: "approved", outreach_sent_at: "2026-05-25T12:00:00.000Z", response_type: "positive" })
    ]);

    expect(stats.waiting).toBe(2);
    expect(stats.avgScore).toBe(70);
    expect(stats.approvedToday).toBeGreaterThanOrEqual(0);
    expect(stats.responseRate).toBe(100);
  });

  it("calculates cost per approved lead from configured monthly cost", () => {
    const leads = [
      normalizeLead({ id: "1", company_name: "A", domain_root: "a.com", status: "approved" }),
      normalizeLead({ id: "2", company_name: "B", domain_root: "b.com", status: "sent", sent_at: "2026-05-26T12:00:00.000Z" }),
      normalizeLead({ id: "3", company_name: "C", domain_root: "c.com", status: "awaiting_approval" })
    ];

    expect(calculateSentStats(leads, 140).costPerApproved).toBe(70);
  });

  it("falls back to monthly_cost_usd saved on leads", () => {
    const leads = [
      normalizeLead({ id: "1", company_name: "A", domain_root: "a.com", status: "approved", monthly_cost_usd: 90 }),
      normalizeLead({ id: "2", company_name: "B", domain_root: "b.com", status: "sent", monthly_cost_usd: 90 })
    ];

    expect(calculateSentStats(leads, 0).monthlyCostUsd).toBe(90);
    expect(calculateSentStats(leads, 0).costPerApproved).toBe(45);
  });
});
