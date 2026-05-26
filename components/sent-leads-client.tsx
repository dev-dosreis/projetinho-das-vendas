"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { calculateSentStats } from "@/lib/lead-helpers";
import { ICP_LABELS, type Lead, type ResponseType } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type SentLeadsClientProps = {
  initialLeads: Lead[];
  usingDemoData: boolean;
  dataError?: string;
  monthlyCostUsd: number;
};

const RESPONSE_FILTERS = [
  ["all", "Todos"],
  ["waiting", "Aguardando"],
  ["positive", "Positivo"],
  ["negative", "Negativo"],
  ["no_response", "Sem resposta"]
];

const CHANNEL_FILTERS = [
  ["all", "Todos"],
  ["whatsapp", "WhatsApp"],
  ["email", "E-mail"]
];

export default function SentLeadsClient({ initialLeads, usingDemoData, dataError, monthlyCostUsd }: SentLeadsClientProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [responseFilter, setResponseFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [icpFilter, setIcpFilter] = useState("all");
  const [messageLead, setMessageLead] = useState<Lead | null>(null);
  const [responseLead, setResponseLead] = useState<Lead | null>(null);
  const [responseType, setResponseType] = useState<ResponseType>("positive");
  const [responseNotes, setResponseNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const stats = calculateSentStats(leads, monthlyCostUsd);
  const sentLeads = stats.sentLeads;
  const icps = Array.from(new Set(sentLeads.map((lead) => lead.icp).filter(Boolean))).sort();
  const filteredLeads = sentLeads.filter((lead) => {
    const response = normalizeResponse(lead.response_type);
    const channel = normalizeChannel(lead.outreach_channel);

    return (
      (responseFilter === "all" || response === responseFilter) &&
      (channelFilter === "all" || channel === channelFilter) &&
      (icpFilter === "all" || lead.icp === icpFilter)
    );
  });

  function openResponseDialog(lead: Lead) {
    const currentResponse = normalizeResponse(lead.response_type);

    setResponseLead(lead);
    setResponseType(currentResponse === "waiting" ? "positive" : currentResponse);
    setResponseNotes(lead.objection ?? "");
  }

  async function saveResponse() {
    if (!responseLead) return;

    const previous = leads;

    startTransition(() => {
      setLeads((current) =>
        current.map((lead) =>
          lead.id === responseLead.id
            ? { ...lead, response_type: responseType, objection: responseNotes, meeting_scheduled: responseType === "positive" }
            : lead
        )
      );
    });

    const response = await fetch(`/api/leads/${responseLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "response",
        responseType,
        notes: responseNotes,
        meetingScheduled: responseType === "positive"
      })
    });

    if (!response.ok) {
      setLeads(previous);
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(result?.error ?? "Nao foi possivel registrar resposta");
      return;
    }

    toast.success("Resposta registrada");
    setResponseLead(null);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Enviados</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Acompanhe abordagens, respostas, reunioes e custo por lead aprovado.
          </p>
        </div>
        <Button variant="outline" className="h-11 rounded-2xl bg-white px-5" onClick={() => location.reload()}>
          Atualizar
        </Button>
      </section>

      {usingDemoData ? (
        <Card className="clean-card border-rose-200 bg-rose-50">
          <CardContent className="p-4 text-sm text-rose-700">
            {dataError ?? "Modo demo ativo. Configure o Supabase para usar dados reais."}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Enviados" value={stats.totalSent} caption="abordagens feitas" />
        <Metric label="Resposta" value={`${stats.responseRate}%`} caption={`${stats.responded} responderam`} />
        <Metric label="Positivas" value={stats.positive} caption="com interesse" />
        <Metric label="Reunioes" value={stats.meetings} caption="agendadas" />
        <Metric
          label="Custo/aprovado"
          value={stats.hasCostConfig ? formatUsd(stats.costPerApproved) : "N/D"}
          caption={stats.hasCostConfig ? `${stats.approvedCount} aprovados` : "sem custo cadastrado"}
        />
      </section>

      <section className="clean-card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-950">Filtros</p>
          <p className="text-xs text-slate-400">{filteredLeads.length} resultados</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 md:w-[620px]">
          <FilterSelect label="Status" value={responseFilter} onChange={setResponseFilter} options={RESPONSE_FILTERS} />
          <FilterSelect label="Canal" value={channelFilter} onChange={setChannelFilter} options={CHANNEL_FILTERS} />
          <FilterSelect
            label="ICP"
            value={icpFilter}
            onChange={setIcpFilter}
            options={[["all", "Todos"], ...icps.map((icp) => [String(icp), ICP_LABELS[icp as keyof typeof ICP_LABELS] ?? String(icp)])]}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {filteredLeads.length ? (
          filteredLeads.map((lead) => (
            <SentLeadRow
              key={lead.id}
              lead={lead}
              onMessage={() => setMessageLead(lead)}
              onResponse={() => openResponseDialog(lead)}
            />
          ))
        ) : (
          <Card className="clean-card">
            <CardContent className="flex min-h-52 flex-col items-center justify-center p-8 text-center">
              <p className="text-lg font-semibold text-slate-950">Sem enviados por enquanto</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Quando um lead for marcado como enviado, ele aparece aqui com resposta, follow-up e custo.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <Sheet open={Boolean(messageLead)} onOpenChange={(open) => !open && setMessageLead(null)}>
        <SheetContent className="w-full border-slate-200 bg-white text-slate-950 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Mensagem</SheetTitle>
            <SheetDescription>{messageLead?.company_name}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-3">
            <MessageBlock title="WhatsApp" value={messageLead?.msg_whatsapp} />
            <MessageBlock title="Assunto de email" value={messageLead?.msg_email_subject} />
            <MessageBlock title="Follow-up D+3" value={messageLead?.msg_followup_d3} />
            <MessageBlock title="Follow-up D+7" value={messageLead?.msg_followup_d7} />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(responseLead)} onOpenChange={(open) => !open && setResponseLead(null)}>
        <DialogContent className="rounded-[1.5rem] border-slate-200 bg-white text-slate-950">
          <DialogHeader>
            <DialogTitle>Registrar resposta</DialogTitle>
            <DialogDescription>{responseLead?.company_name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <FilterSelect
              label="Resposta"
              value={responseType}
              onChange={(value) => setResponseType(value as ResponseType)}
              options={[
                ["positive", "Positivo"],
                ["negative", "Negativo"],
                ["no_response", "Sem resposta"]
              ]}
            />
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
              Observacao
              <Textarea
                value={responseNotes}
                onChange={(event) => setResponseNotes(event.target.value)}
                className="min-h-28 rounded-2xl border-slate-200 bg-white text-slate-800"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl bg-white" onClick={() => setResponseLead(null)}>
              Cancelar
            </Button>
            <Button disabled={isPending} className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={saveResponse}>
              Salvar resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SentLeadRow({ lead, onMessage, onResponse }: { lead: Lead; onMessage: () => void; onResponse: () => void }) {
  const response = normalizeResponse(lead.response_type);

  return (
    <article className="clean-card grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
      <div className="flex min-w-0 gap-4">
        <div className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-semibold text-emerald-700">
          {lead.company_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-950">{lead.company_name}</h2>
            <ResponseBadge value={response} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {lead.domain_root}
            {lead.city ? ` · ${lead.city}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <SoftTag>{normalizeChannel(lead.outreach_channel) === "email" ? "E-mail" : "WhatsApp"}</SoftTag>
            <SoftTag>{lead.outreach_sent_at ? formatDate(lead.outreach_sent_at) : "Sem data"}</SoftTag>
            <SoftTag>Score {lead.total_score}</SoftTag>
            {lead.icp ? <SoftTag>{ICP_LABELS[lead.icp]}</SoftTag> : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        <Button variant="outline" className="h-10 rounded-2xl bg-white" onClick={onMessage}>
          Mensagem
        </Button>
        <Button className="h-10 rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={onResponse}>
          Resposta
        </Button>
      </div>
    </article>
  );
}

function Metric({ label, value, caption }: { label: string; value: string | number; caption: string }) {
  return (
    <Card className="clean-card">
      <CardContent className="p-5">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <p className="mt-4 font-mono text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{caption}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 rounded-2xl border-slate-200 bg-white text-slate-950">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-slate-200 bg-white text-slate-950">
          <SelectGroup>
            {options.map(([optionValue, optionLabel]) => (
              <SelectItem key={optionValue} value={optionValue}>
                {optionLabel}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  );
}

function ResponseBadge({ value }: { value: string }) {
  const labels: Record<string, string> = {
    waiting: "Aguardando",
    positive: "Positivo",
    negative: "Negativo",
    no_response: "Sem resposta"
  };

  return (
    <Badge variant="outline" className={cn("rounded-full border-transparent px-2.5 py-1 text-[11px] font-medium", badgeTone(value))}>
      {labels[value] ?? "Aguardando"}
    </Badge>
  );
}

function SoftTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-500">
      {children}
    </span>
  );
}

function MessageBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-xs font-medium text-slate-400">{title}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{value || "Mensagem nao gerada."}</p>
    </div>
  );
}

function normalizeResponse(value: Lead["response_type"]) {
  return value === "positive" || value === "negative" || value === "no_response" ? value : "waiting";
}

function normalizeChannel(value: Lead["outreach_channel"]) {
  return value === "email" ? "email" : "whatsapp";
}

function badgeTone(value: string) {
  if (value === "positive") return "bg-emerald-50 text-emerald-700";
  if (value === "negative") return "bg-rose-50 text-rose-700";
  if (value === "no_response") return "bg-slate-100 text-slate-500";
  return "bg-amber-50 text-amber-700";
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}
