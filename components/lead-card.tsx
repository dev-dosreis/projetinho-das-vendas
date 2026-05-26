"use client";

import { useState } from "react";
import { Check, Clock, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ICP_LABELS, type Lead } from "@/lib/types";
import { cn, REJECTION_REASONS } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onAction: (id: string, action: "approve" | "snooze" | "reject", reason?: string) => Promise<void>;
}

export default function LeadCard({ lead, onAction }: LeadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<"approve" | "snooze" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const score = lead.total_score ?? lead.fit_score + lead.timing_score;
  const icp = lead.icp ?? "outro";
  const initials = getInitials(lead.company_name);

  async function handleAction(action: "approve" | "snooze" | "reject", reason?: string) {
    setLoading(action);
    try {
      await onAction(lead.id, action, reason);
    } finally {
      setLoading(null);
    }
  }

  return (
    <article className="clean-card grid gap-6 rounded-[1.65rem] p-5 lg:grid-cols-[320px_1fr_280px_160px] lg:items-center">
      <section className="flex min-w-0 gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 font-semibold text-emerald-700">
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight text-slate-950">{lead.company_name}</h2>
          <a
            href={`https://${lead.domain_root}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-950"
          >
            {lead.domain_root}
            <ExternalLink className="size-3" />
          </a>
          <div className="mt-5 flex flex-wrap gap-2">
            {lead.city ? <SoftChip>{lead.city}</SoftChip> : null}
            <SoftChip>{ICP_LABELS[icp]}</SoftChip>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-[260px_1fr] lg:grid-cols-[250px_1fr]">
        <div className="grid grid-cols-3 gap-3">
          <ScorePill label="Fit" value={lead.fit_score} tone={lead.fit_score >= 70 ? "green" : "amber"} />
          <ScorePill label="Timing" value={lead.timing_score} tone={lead.timing_score >= 70 ? "green" : "amber"} />
          <ScorePill label="Total" value={score} tone={score >= 70 ? "green" : score >= 50 ? "amber" : "red"} />
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">Sinais detectados</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lead.whatsapp_detected ? <SignalChip label="WhatsApp" /> : null}
            {lead.has_pixel ? <SignalChip label="Meta Pixel" /> : null}
            {lead.has_crm && lead.crm_name ? <SignalChip label={lead.crm_name} /> : null}
            {lead.pagespeed_mobile != null ? <SignalChip label={`PageSpeed ${lead.pagespeed_mobile}`} /> : null}
            {lead.contact_email ? <SignalChip label="E-mail" /> : null}
            {!lead.whatsapp_detected && !lead.has_pixel && !lead.has_crm && lead.pagespeed_mobile == null ? (
              <SignalChip label="Sem sinais fortes" muted />
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-slate-200 lg:border-l lg:pl-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">Mensagem WhatsApp</p>
        <p className={cn("mt-3 text-sm leading-6 text-slate-600", !expanded && "line-clamp-3")}>
          {lead.msg_whatsapp || "Mensagem ainda nao gerada."}
        </p>
        {lead.msg_whatsapp ? (
          <button
            type="button"
            className="mt-3 text-sm font-medium text-emerald-700 hover:text-emerald-800"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Ver menos" : "Ver completa"}
          </button>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        {!rejecting ? (
          <>
            <Button
              disabled={Boolean(loading)}
              className="h-11 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => handleAction("approve")}
            >
              <Check data-icon="inline-start" />
              Aprovar
            </Button>
            <Button
              disabled={Boolean(loading)}
              variant="outline"
              className="h-11 rounded-2xl bg-white"
              onClick={() => handleAction("snooze")}
            >
              <Clock data-icon="inline-start" />
              Adiar 7 dias
            </Button>
            <Button
              disabled={Boolean(loading)}
              variant="outline"
              className="h-11 rounded-2xl bg-white text-slate-700"
              onClick={() => setRejecting(true)}
            >
              <X data-icon="inline-start" />
              Rejeitar
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Select value={rejectionReason} onValueChange={setRejectionReason}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950">
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 bg-white text-slate-950">
                <SelectGroup>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              disabled={!rejectionReason || loading === "reject"}
              className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
              onClick={() => handleAction("reject", rejectionReason)}
            >
              Confirmar
            </Button>
            <Button variant="ghost" className="h-10 rounded-2xl text-slate-500" onClick={() => setRejecting(false)}>
              Cancelar
            </Button>
          </div>
        )}
      </section>
    </article>
  );
}

function ScorePill({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <div className={cn("rounded-2xl border px-4 py-2 text-center font-mono text-lg font-semibold", scoreTone(tone))}>
        {value}
      </div>
    </div>
  );
}

function SignalChip({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium",
        muted ? "text-slate-400" : "text-slate-600"
      )}
    >
      {label}
    </Badge>
  );
}

function SoftChip({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

function scoreTone(tone: "green" | "amber" | "red") {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "red") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LD";
}
