"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, SlidersHorizontal } from "lucide-react";
import LeadCard from "@/components/lead-card";
import StatsBar from "@/components/stats-bar";
import { filterLeads, calculateStats, getUniqueIcps } from "@/lib/lead-helpers";
import { ICP_LABELS, type Lead } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type BandejaClientProps = {
  initialLeads: Lead[];
  usingDemoData: boolean;
  dataError?: string;
};

export default function BandejaClient({ initialLeads, usingDemoData, dataError }: BandejaClientProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [city, setCity] = useState("");
  const [icp, setIcp] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [isPending, startTransition] = useTransition();
  const deferredCity = useDeferredValue(city);

  const icps = getUniqueIcps(leads);
  const visibleLeads = filterLeads(leads, { city: deferredCity, icp, minScore });
  const stats = calculateStats(leads);

  async function handleAction(id: string, action: "approve" | "snooze" | "reject", reason?: string) {
    const previous = leads;
    const lead = leads.find((item) => item.id === id);

    if (!lead) {
      return;
    }

    startTransition(() => {
      setLeads((current) => current.filter((item) => item.id !== id));
    });

    const response = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, reason })
    });

    if (!response.ok) {
      setLeads(previous);
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(result?.error ?? "Nao foi possivel salvar");
      return;
    }

    const labels = {
      approve: "Lead aprovado",
      snooze: "Lead adiado por 7 dias",
      reject: "Lead rejeitado"
    };
    toast.success(labels[action]);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Bandeja</h1>
          <p className="mt-1 text-sm text-slate-500">
            Aprove somente os leads que valem uma abordagem agora.
          </p>
        </div>
        <div className="liquid-pill rounded-2xl px-5 py-3 text-sm text-slate-500">
          <span className="font-mono text-lg font-bold text-emerald-600">{visibleLeads.length}</span>{" "}
          aguardando decisão
        </div>
      </section>

      {usingDemoData ? (
        <Alert className="liquid-card rounded-2xl border-rose-200/80 bg-rose-50/65 text-rose-700">
          <AlertDescription className="liquid-content">
            {dataError ?? "Modo demo ativo. Configure o Supabase para usar leads reais."}
          </AlertDescription>
        </Alert>
      ) : null}

      <StatsBar
        waiting={stats.waiting}
        approvedToday={stats.approvedToday}
        sent={stats.sent}
        responseRate={stats.responseRate}
      />

      <Card className="liquid-card rounded-[1.6rem]">
        <CardHeader className="liquid-content flex flex-row items-center gap-2 p-4 pb-2">
          <SlidersHorizontal className="size-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold text-slate-950">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="liquid-content grid gap-3 p-4 pt-2 md:grid-cols-[1fr_180px_180px]">
          <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            Cidade
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ex: Campinas"
                className="liquid-input h-11 rounded-2xl pl-9 text-slate-950 placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            ICP
            <Select value={icp} onValueChange={setIcp}>
              <SelectTrigger className="liquid-input h-11 rounded-2xl text-slate-950">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/80 bg-white/85 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
                <SelectGroup>
                  <SelectItem value="all">Todos</SelectItem>
                  {icps.map((item) => (
                    <SelectItem key={item} value={item}>
                      {ICP_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            Score minimo
            <Input
              value={minScore}
              min={0}
              max={100}
              step={5}
              type="number"
              onChange={(event) => setMinScore(Number(event.target.value))}
              className="liquid-input h-11 rounded-2xl text-slate-950"
            />
          </label>
        </CardContent>
      </Card>

      <section className="grid gap-4">
        {visibleLeads.length ? (
          visibleLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onAction={handleAction} />
          ))
        ) : (
          <Card className="liquid-card rounded-[1.6rem]">
            <CardContent className="liquid-content px-6 py-12 text-center">
              <h2 className="text-xl font-bold text-slate-950">Nenhum lead na bandeja</h2>
              <p className="mt-2 text-sm text-slate-500">
                {isPending ? "Atualizando lista..." : "Limpe os filtros ou aguarde novos leads enriquecidos."}
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
