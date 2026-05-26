"use client";

import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock, Gauge, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsProps {
  waiting: number;
  avgScore: number;
  approvedToday: number;
  responseRate: number;
}

export default function StatsBar({ waiting, avgScore, approvedToday, responseRate }: StatsProps) {
  const stats = [
    {
      icon: Clock,
      label: "Aguardando",
      helper: "Leads para revisar",
      value: waiting
    },
    {
      icon: Gauge,
      label: "Score medio",
      helper: "Entre os aguardando",
      value: avgScore
    },
    {
      icon: CheckCircle2,
      label: "Aprovados hoje",
      helper: "Validacoes do dia",
      value: approvedToday
    },
    {
      icon: MessageSquare,
      label: "Resposta",
      helper: "Ultimos 7 dias",
      value: `${responseRate}%`
    }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <MetricCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, helper, value }: { icon: LucideIcon; label: string; helper: string; value: string | number }) {
  return (
    <Card className="clean-card rounded-[1.55rem]">
      <CardContent className="flex items-start justify-between gap-5 p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-5 font-mono text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm text-slate-400">{helper}</p>
        </div>
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700")}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
