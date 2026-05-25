"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart3,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Database,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Radio,
  Smartphone,
  Target,
  Zap,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ICP_COLORS, ICP_LABELS, type Lead } from "@/lib/types";
import { cn, formatDate, REJECTION_REASONS, scoreBg, scoreColor, scoreRing } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onAction: (id: string, action: "approve" | "snooze" | "reject", reason?: string) => Promise<void>;
}

export default function LeadCard({ lead, onAction }: LeadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [loading, setLoading] = useState<"approve" | "snooze" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [editedMsg, setEditedMsg] = useState(lead.msg_whatsapp ?? "");

  async function handleAction(action: "approve" | "snooze" | "reject", reason?: string) {
    setLoading(action);
    try {
      await onAction(lead.id, action, reason);
    } finally {
      setLoading(null);
      setShowReject(false);
    }
  }

  async function copyMsg() {
    await navigator.clipboard.writeText(editedMsg);
    setCopiedMsg(true);
    toast.success("Mensagem copiada");
    setTimeout(() => setCopiedMsg(false), 2000);
  }

  const score = lead.total_score ?? lead.fit_score + lead.timing_score;
  const icp = lead.icp ?? "outro";

  return (
    <Card
      className={cn(
        "liquid-card rounded-[1.75rem] transition-all duration-300",
        "ring-2 ring-transparent hover:-translate-y-0.5 hover:ring-1",
        scoreBg(score),
        scoreRing(score)
      )}
    >
      <CardHeader className="liquid-content flex flex-row items-start justify-between gap-4 p-5 pb-0">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", ICP_COLORS[icp])}
            >
              {ICP_LABELS[icp]}
            </Badge>
            {lead.ad_source ? (
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-white/60 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500"
              >
                {String(lead.ad_source)}
              </Badge>
            ) : null}
          </div>

          <CardTitle className="truncate text-xl font-bold tracking-[-0.03em] text-slate-950">
            {lead.company_name}
          </CardTitle>
          <CardDescription className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <a
              href={`https://${lead.domain_root}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-slate-700 underline-offset-4 hover:underline"
            >
              {lead.domain_root}
              <ExternalLink className="size-3" />
            </a>
            {lead.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {lead.city}
              </span>
            ) : null}
          </CardDescription>
        </div>

        <div
          className={cn(
            "liquid-pill flex size-20 shrink-0 flex-col items-center justify-center rounded-full",
            score >= 70 ? "text-emerald-600" : score >= 50 ? "text-slate-700" : "text-rose-600"
          )}
        >
          <span className={cn("font-mono text-3xl font-black leading-none", scoreColor(score))}>
            {score}
          </span>
          <span className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500">score</span>
        </div>
      </CardHeader>

      <CardContent className="liquid-content flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <ScoreBar label="Fit" value={lead.fit_score} max={50} />
          <ScoreBar label="Timing" value={lead.timing_score} max={50} />
        </div>

        <div className="flex flex-wrap gap-2">
          {lead.whatsapp_detected ? <Signal icon={Smartphone} label="WhatsApp" /> : null}
          {lead.has_pixel ? <Signal icon={Target} label="Meta Pixel" /> : null}
          {lead.has_crm && lead.crm_name ? <Signal icon={Database} label={lead.crm_name} /> : null}
          {lead.pagespeed_mobile != null ? <Signal icon={Zap} label={`Mobile ${lead.pagespeed_mobile}`} /> : null}
          {lead.contact_whatsapp ? <Signal icon={Check} label="Contato direto" /> : null}
          {lead.contact_email ? <Signal icon={Mail} label="E-mail" /> : null}
          {lead.ad_active ? <Signal icon={Radio} label="Anuncio ativo" /> : null}
        </div>

        {lead.contact_name || lead.contact_email ? (
          <div className="text-sm text-slate-500">
            {lead.contact_name ? <span className="font-medium text-slate-950">{lead.contact_name}</span> : null}
            {lead.contact_name && lead.contact_email ? " · " : null}
            {lead.contact_email ? <span className="font-mono text-xs">{lead.contact_email}</span> : null}
          </div>
        ) : null}

        <p className="text-[11px] text-slate-400">Adicionado {formatDate(lead.created_at)}</p>

        {editedMsg ? (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 w-full justify-between rounded-2xl border border-white/70 bg-white/45 px-4 font-semibold text-slate-700 shadow-inner backdrop-blur-xl hover:bg-white/70"
              >
                <span className="inline-flex items-center gap-2">
                  <MessageCircle data-icon="inline-start" />
                  Mensagem WhatsApp
                </span>
                <ChevronDown
                  className={cn("transition-transform duration-200", expanded && "rotate-180")}
                  data-icon="inline-end"
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="flex flex-col gap-2">
                <Textarea
                  value={editedMsg}
                  onChange={(event) => setEditedMsg(event.target.value)}
                  rows={5}
                  className="min-h-36 rounded-2xl border-slate-200/80 bg-white/55 font-mono text-sm leading-relaxed text-slate-800 shadow-inner backdrop-blur-xl focus-visible:ring-emerald-200"
                />
                <Button
                  onClick={copyMsg}
                  variant="outline"
                  className={cn(
                    "h-11 rounded-2xl border-white/75 bg-white/55 font-semibold text-slate-600 shadow-inner backdrop-blur-xl hover:bg-white/75 hover:text-slate-950",
                    copiedMsg && "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                  )}
                >
                  {copiedMsg ? <CheckCheck data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                  {copiedMsg ? "Copiado" : "Copiar mensagem"}
                </Button>

                {lead.msg_followup_d3 || lead.msg_followup_d7 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {lead.msg_followup_d3 ? (
                      <CopyButton label="Follow-up D+3" text={lead.msg_followup_d3} />
                    ) : null}
                    {lead.msg_followup_d7 ? (
                      <CopyButton label="Follow-up D+7" text={lead.msg_followup_d7} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        {lead.audit_points?.length ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/45 p-4 shadow-inner backdrop-blur-xl">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <BarChart3 className="size-3.5" />
              Pontos de auditoria
            </p>
            <div className="flex flex-col gap-2">
              {lead.audit_points.map((point, index) => (
                <div key={`${point.problem}-${index}`} className="rounded-xl border border-slate-200 bg-white/60 p-3 text-xs">
                  <p className="mb-0.5 font-semibold text-rose-600">Problema: {point.problem}</p>
                  <p className="text-slate-500">Impacto: {point.impact}</p>
                  <p className="mt-0.5 text-emerald-700">Recomendação: {point.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>

      <Separator className="relative z-10 bg-white/70" />

      <CardFooter className="liquid-content p-4">
        {!showReject ? (
          <div className="grid w-full grid-cols-3 gap-2">
            <ActionButton
              onClick={() => handleAction("approve")}
              loading={loading === "approve"}
              color="green"
              icon={Check}
              label="Aprovar"
            />
            <ActionButton
              onClick={() => handleAction("snooze")}
              loading={loading === "snooze"}
              color="gray"
              icon={Clock}
              label="Adiar 7d"
            />
            <ActionButton
              onClick={() => setShowReject(true)}
              loading={false}
              color="red"
              icon={X}
              label="Rejeitar"
            />
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3 animate-slide-up">
            <p className="text-sm font-semibold text-slate-950">Por que rejeitar?</p>
            <div className="grid grid-cols-2 gap-2">
              {REJECTION_REASONS.map((reason) => (
                <Button
                  key={reason}
                  onClick={() => handleAction("reject", reason)}
                  disabled={loading === "reject"}
                  variant="outline"
                  className="justify-start rounded-2xl border-rose-100 bg-white/55 px-3 text-left text-xs text-slate-600 backdrop-blur-xl hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  {reason}
                </Button>
              ))}
            </div>
            <Button
              onClick={() => setShowReject(false)}
              variant="ghost"
              className="rounded-2xl text-slate-500 hover:bg-white/60 hover:text-slate-950"
            >
              Cancelar
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

function CopyButton({ label, text }: { label: string; text: string }) {
  return (
    <Button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        toast.success(`${label} copiado`);
      }}
      variant="outline"
      className="rounded-2xl border-white/75 bg-white/55 text-xs text-slate-500 shadow-inner backdrop-blur-xl hover:bg-white/75 hover:text-slate-950"
    >
      {label}
    </Button>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className="rounded-2xl border border-white/70 bg-white/45 p-3 shadow-inner backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
        <span className="font-mono text-[11px] font-bold text-slate-700">
          {value}/{max}
        </span>
      </div>
      <Progress value={pct} className="h-2 bg-slate-200/80 [&>div]:bg-emerald-500" />
    </div>
  );
}

function Signal({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Badge
      variant="outline"
      className="gap-1 rounded-full border-white/75 bg-white/55 px-3 py-1.5 font-medium text-slate-600 shadow-inner backdrop-blur-xl"
    >
      <Icon className="size-3.5" />
      {label}
    </Badge>
  );
}

function ActionButton({
  onClick,
  loading,
  color,
  icon: Icon,
  label
}: {
  onClick: () => void;
  loading: boolean;
  color: "green" | "gray" | "red";
  icon: LucideIcon;
  label: string;
}) {
  const styles = {
    green: "border-emerald-600 bg-emerald-600 text-white shadow-[0_16px_40px_rgba(16,185,129,0.28)] hover:bg-emerald-700 hover:border-emerald-700",
    gray: "border-white/75 bg-white/55 text-slate-600 shadow-inner backdrop-blur-xl hover:bg-white/75 hover:text-slate-950",
    red: "border-rose-200 bg-white/55 text-rose-600 shadow-inner backdrop-blur-xl hover:bg-rose-50 hover:border-rose-300"
  };

  return (
    <Button
      onClick={onClick}
      disabled={loading}
      variant="outline"
      className={cn("h-16 flex-col rounded-2xl text-sm font-semibold", styles[color])}
    >
      {loading ? (
        <div className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Icon data-icon="inline-start" />
      )}
      <span className="text-xs">{label}</span>
    </Button>
  );
}
