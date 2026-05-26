"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import LeadCard from "@/components/lead-card";
import StatsBar from "@/components/stats-bar";
import { filterLeads, calculateStats, getUniqueIcps } from "@/lib/lead-helpers";
import { ICP_LABELS, type Lead } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

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
    <div className="flex flex-col gap-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Bandeja</h1>
          <p className="mt-2 text-base text-slate-500">Leads aguardando sua aprovacao</p>
        </div>
        <Button variant="outline" className="h-11 rounded-2xl bg-white px-5" onClick={() => location.reload()}>
          Atualizar
        </Button>
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
        avgScore={stats.avgScore}
        approvedToday={stats.approvedToday}
        responseRate={stats.responseRate}
      />

      <Card className="clean-card rounded-[1.55rem]">
        <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_280px_1fr_120px] md:items-end">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-950">
            Cidade
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ex: Campinas"
                className="h-12 rounded-2xl border-slate-200 bg-white pl-9 text-slate-950 placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-950">
            ICP
            <Select value={icp} onValueChange={setIcp}>
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white text-slate-950">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 bg-white text-slate-950">
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

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-950">
            <span className="flex items-center justify-between gap-3">
              Score minimo
              <span className="rounded-xl bg-slate-50 px-3 py-1 font-mono text-sm font-semibold text-slate-950">{minScore}</span>
            </span>
            <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-4">
              <Slider
                value={[minScore]}
                min={0}
                max={100}
                step={5}
                aria-label="Score minimo"
                onValueChange={(value) => setMinScore(value[0] ?? 0)}
                className="[&_[role=slider]]:border-emerald-500 [&_[role=slider]]:bg-white [&_[data-orientation=horizontal]]:bg-slate-200 [&_[data-orientation=horizontal]>span]:bg-emerald-500"
              />
            </div>
          </label>
          <Button
            variant="outline"
            className="h-12 rounded-2xl bg-white"
            onClick={() => {
              setCity("");
              setIcp("all");
              setMinScore(0);
            }}
          >
            Limpar
          </Button>
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
