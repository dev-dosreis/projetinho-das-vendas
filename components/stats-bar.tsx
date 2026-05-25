"use client";

import { CheckCircle2, Clock, Send, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsProps {
  waiting: number;
  approvedToday: number;
  sent: number;
  responseRate: number;
}

export default function StatsBar({ waiting, approvedToday, sent, responseRate }: StatsProps) {
  const stats = [
    {
      icon: Clock,
      label: "Aguardando",
      helper: "para decidir",
      value: waiting,
      color: "text-slate-700"
    },
    {
      icon: CheckCircle2,
      label: "Aprovados",
      helper: "hoje",
      value: approvedToday,
      color: "text-emerald-600"
    },
    {
      icon: Send,
      label: "Enviados",
      helper: "abordagens",
      value: sent,
      color: "text-slate-700"
    },
    {
      icon: TrendingUp,
      label: "Resposta",
      helper: "taxa",
      value: `${responseRate}%`,
      color: responseRate >= 15 ? "text-emerald-600" : "text-slate-500"
    }
  ];

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ icon: Icon, label, helper, value, color }) => (
        <Card key={label} className="liquid-card rounded-[1.35rem]">
          <CardContent className="liquid-content flex items-center justify-between gap-3 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {label}
              </span>
              <span className="text-xs text-slate-400">{helper}</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon className={cn("size-4", color)} />
              <span className={cn("font-mono text-3xl font-bold tracking-[-0.05em]", color)}>
                {value}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
