"use client";

import { useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, Mail, MessageCircle, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ICP_LABELS, type Lead, type ResponseType } from "@/lib/types";
import { cn, formatDate, scoreColor } from "@/lib/utils";

type SentLeadsClientProps = {
  initialLeads: Lead[];
  usingDemoData: boolean;
  dataError?: string;
};

const RESPONSE_FILTERS = [
  ["all", "Todos"],
  ["waiting", "Aguardando resposta"],
  ["positive", "Respondeu positivo"],
  ["negative", "Respondeu negativo"],
  ["no_response", "Sem resposta"]
];

const CHANNEL_FILTERS = [
  ["all", "Todos"],
  ["whatsapp", "WhatsApp"],
  ["email", "E-mail"]
];

export default function SentLeadsClient({ initialLeads, usingDemoData, dataError }: SentLeadsClientProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [responseFilter, setResponseFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [icpFilter, setIcpFilter] = useState("all");
  const [messageLead, setMessageLead] = useState<Lead | null>(null);
  const [responseLead, setResponseLead] = useState<Lead | null>(null);
  const [responseType, setResponseType] = useState<ResponseType>("positive");
  const [responseNotes, setResponseNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const sentLeads = leads.filter((lead) => lead.status === "sent" || Boolean(lead.outreach_sent_at));
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
  const totalSent = sentLeads.length;
  const responded = sentLeads.filter((lead) => ["positive", "negative"].includes(normalizeResponse(lead.response_type))).length;
  const positive = sentLeads.filter((lead) => normalizeResponse(lead.response_type) === "positive").length;
  const meetings = sentLeads.filter((lead) => lead.meeting_scheduled).length;
  const responseRate = totalSent === 0 ? 0 : Math.round((responded / totalSent) * 100);

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
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Enviados</h1>
        <p className="max-w-2xl text-sm text-slate-500">Acompanhe abordagens enviadas, respostas e proximos follow-ups.</p>
      </section>

      {usingDemoData ? (
        <Card className="liquid-card rounded-2xl border-rose-200/80 bg-rose-50/65">
          <CardContent className="liquid-content p-4 text-sm text-rose-700">
            {dataError ?? "Modo demo ativo. Configure o Supabase para usar dados reais."}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={Users} label="Total enviados" value={totalSent} />
        <Metric icon={TrendingUp} label="Taxa resposta" value={`${responseRate}%`} active={responseRate >= 15} />
        <Metric icon={CheckCircle2} label="Positivas" value={positive} active={positive > 0} />
        <Metric icon={CalendarClock} label="Reunioes" value={meetings} active={meetings > 0} />
      </div>

      <Card className="liquid-card rounded-[1.6rem]">
        <CardHeader className="liquid-content p-4 pb-2">
          <CardTitle className="text-sm font-semibold text-slate-950">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="liquid-content grid gap-3 p-4 pt-2 md:grid-cols-3">
          <FilterSelect label="Status" value={responseFilter} onChange={setResponseFilter} options={RESPONSE_FILTERS} />
          <FilterSelect label="Canal" value={channelFilter} onChange={setChannelFilter} options={CHANNEL_FILTERS} />
          <FilterSelect
            label="ICP"
            value={icpFilter}
            onChange={setIcpFilter}
            options={[["all", "Todos"], ...icps.map((icp) => [String(icp), ICP_LABELS[icp as keyof typeof ICP_LABELS] ?? String(icp)])]}
          />
        </CardContent>
      </Card>

      <Card className="liquid-card rounded-[1.6rem]">
        <CardContent className="liquid-content p-0">
          {filteredLeads.length ? (
            <Table>
              <TableHeader>
                <TableRow className="border-white/70">
                  <TableHead>Lead</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Resposta</TableHead>
                  <TableHead>Follow-ups</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="border-white/70">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-950">{lead.company_name}</span>
                        <span className="text-xs text-slate-500">{lead.domain_root}{lead.city ? ` · ${lead.city}` : ""}</span>
                        {lead.icp ? <Badge variant="outline" className="w-fit rounded-full bg-white/60 text-slate-600">{ICP_LABELS[lead.icp]}</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          {normalizeChannel(lead.outreach_channel) === "email" ? <Mail data-icon="inline-start" /> : <MessageCircle data-icon="inline-start" />}
                          {normalizeChannel(lead.outreach_channel) === "email" ? "E-mail" : "WhatsApp"}
                        </span>
                        <span className="text-xs text-slate-400">{lead.outreach_sent_at ? formatDate(lead.outreach_sent_at) : "Sem data"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("rounded-full bg-white/60 font-mono", scoreColor(lead.total_score))}>
                        {lead.total_score}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ResponseBadge value={normalizeResponse(lead.response_type)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <FollowupBadge label="D+3" done={Boolean(lead.followup_d3_sent)} />
                        <FollowupBadge label="D+7" done={Boolean(lead.followup_d7_sent)} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="rounded-2xl bg-white/55" onClick={() => setMessageLead(lead)}>
                          Ver mensagem
                        </Button>
                        <Button className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => openResponseDialog(lead)}>
                          Registrar resposta
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-12 text-center">
              <h2 className="text-xl font-bold text-slate-950">Nenhum enviado encontrado</h2>
              <p className="mt-2 text-sm text-slate-500">Quando um lead for marcado como enviado, ele aparece aqui.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={Boolean(messageLead)} onOpenChange={(open) => !open && setMessageLead(null)}>
        <SheetContent className="w-full border-white/70 bg-white/85 text-slate-950 backdrop-blur-2xl sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Mensagem gerada</SheetTitle>
            <SheetDescription>{messageLead?.company_name}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-4">
            <MessageBlock title="WhatsApp" value={messageLead?.msg_whatsapp} />
            <MessageBlock title="Assunto de email" value={messageLead?.msg_email_subject} />
            <MessageBlock title="Follow-up D+3" value={messageLead?.msg_followup_d3} />
            <MessageBlock title="Follow-up D+7" value={messageLead?.msg_followup_d7} />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(responseLead)} onOpenChange={(open) => !open && setResponseLead(null)}>
        <DialogContent className="rounded-[1.5rem] border-white/70 bg-white/90 text-slate-950 backdrop-blur-2xl">
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
            <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              Observacao
              <Textarea
                value={responseNotes}
                onChange={(event) => setResponseNotes(event.target.value)}
                className="min-h-28 rounded-2xl border-slate-200/80 bg-white/55 text-slate-800 shadow-inner backdrop-blur-xl"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl bg-white/55" onClick={() => setResponseLead(null)}>
              Cancelar
            </Button>
            <Button disabled={isPending} className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={saveResponse}>
              Salvar resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value, active = false }: { icon: typeof Users; label: string; value: string | number; active?: boolean }) {
  return (
    <Card className="liquid-card rounded-[1.35rem]">
      <CardContent className="liquid-content flex items-center justify-between gap-3 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <span className={cn("flex items-center gap-2 font-mono text-3xl font-bold", active ? "text-emerald-600" : "text-slate-700")}>
          <Icon data-icon="inline-start" />
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="liquid-input h-11 rounded-2xl text-slate-950">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-white/80 bg-white/90 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
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
    <Badge variant="outline" className={cn("rounded-full bg-white/60", value === "positive" ? "text-emerald-600" : value === "negative" ? "text-rose-600" : "text-slate-600")}>
      {labels[value] ?? "Aguardando"}
    </Badge>
  );
}

function FollowupBadge({ label, done }: { label: string; done: boolean }) {
  return (
    <Badge variant="outline" className={cn("rounded-full bg-white/60", done ? "text-emerald-600" : "text-slate-500")}>
      {label} {done ? "feito" : "pendente"}
    </Badge>
  );
}

function MessageBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-inner backdrop-blur-xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
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
