"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { IntegrationHealthItem, IntegrationState } from "@/lib/integration-health";
import { cn, formatDate } from "@/lib/utils";

type Health = Awaited<ReturnType<typeof import("@/lib/integration-health").getIntegrationHealth>>;

const CATEGORIES = ["Coleta", "Pesquisa", "Contato", "Infra"] as const;

export default function ApiStatusClient({ initialHealth }: { initialHealth: Health }) {
  const [health, setHealth] = useState(initialHealth);
  const [isPending, startTransition] = useTransition();

  async function runLiveCheck() {
    startTransition(async () => {
      const response = await fetch("/api/integrations?live=1", { cache: "no-store" });
      const result = await response.json() as Health;

      if (!response.ok) {
        toast.error("Nao foi possivel checar as APIs");
        return;
      }

      setHealth(result);
      toast.success("APIs checadas");
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">APIs</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Painel simples para saber se o pipeline esta pronto. As chaves nunca aparecem na tela.
          </p>
        </div>
        <Button
          disabled={isPending}
          onClick={runLiveCheck}
          className="h-12 rounded-2xl bg-slate-950 px-6 text-white hover:bg-slate-800"
        >
          {isPending ? "Checando..." : "Checar agora"}
        </Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Configuradas" value={health.summary.configured} />
        <Metric label="Faltando" value={health.summary.missing} danger={health.summary.missing > 0} />
        <Metric label="Total" value={health.summary.total} muted />
        <div className="liquid-card rounded-[1.5rem]">
          <div className="liquid-content p-4">
            <p className="text-xs font-medium text-slate-400">Ultima checagem</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(health.checkedAt)}</p>
            <p className="mt-1 text-xs text-slate-500">{health.live ? "Teste ao vivo" : "Configuracao local"}</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        {CATEGORIES.map((category) => {
          const items = health.items.filter((item) => item.category === category);
          if (!items.length) return null;

          return (
            <Card key={category} className="liquid-card rounded-[1.7rem]">
              <CardHeader className="liquid-content border-b border-white/70 pb-4">
                <CardTitle className="text-base text-slate-950">{category}</CardTitle>
                <CardDescription className="text-sm">Integracoes usadas nesta etapa.</CardDescription>
              </CardHeader>
              <CardContent className="liquid-content divide-y divide-white/70 p-0">
                {items.map((item) => (
                  <IntegrationRow key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

function IntegrationRow({ item }: { item: IntegrationHealthItem }) {
  return (
    <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_180px] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusDot state={item.state} />
          <h2 className="font-medium text-slate-950">{item.name}</h2>
          <StatusBadge state={item.state} label={item.label} />
        </div>
        <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">{item.detail}</p>
      </div>

      <div className="flex flex-col gap-1 md:text-right">
        <p className="text-xs font-medium text-slate-400">Variaveis</p>
        <p className="text-xs leading-5 text-slate-500">
          {item.envNames.slice(0, 2).join(", ")}
          {item.envNames.length > 2 ? ` +${item.envNames.length - 2}` : ""}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, danger = false, muted = false }: { label: string; value: number; danger?: boolean; muted?: boolean }) {
  return (
    <div className="liquid-card rounded-[1.5rem]">
      <div className="liquid-content p-4">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className={cn("mt-2 font-mono text-3xl font-semibold", danger ? "text-rose-600" : muted ? "text-slate-500" : "text-slate-950")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ state, label }: { state: IntegrationState; label: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-medium", toneByState(state).text)}>
      {label}
    </Badge>
  );
}

function StatusDot({ state }: { state: IntegrationState }) {
  return <span className={cn("size-2.5 rounded-full", toneByState(state).dot)} aria-hidden="true" />;
}

function toneByState(state: IntegrationState) {
  if (state === "ok" || state === "ready") {
    return {
      text: "text-emerald-700",
      dot: "bg-emerald-500"
    };
  }

  if (state === "missing" || state === "error") {
    return {
      text: "text-rose-700",
      dot: "bg-rose-500"
    };
  }

  return {
    text: "text-slate-600",
    dot: "bg-slate-300"
  };
}
