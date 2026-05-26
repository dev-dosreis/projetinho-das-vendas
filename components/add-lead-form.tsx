"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

type FormState = {
  domain: string;
  name: string;
  icp: string;
  city: string;
  source: string;
  ad_url: string;
};

const INITIAL_FORM: FormState = {
  domain: "",
  name: "",
  icp: "clinica_estetica",
  city: "",
  source: "meta",
  ad_url: ""
};

const ICP_OPTIONS = [
  ["clinica_estetica", "Clinica Estetica"],
  ["ecommerce", "E-commerce"],
  ["consultoria_b2b", "Consultoria B2B"],
  ["curso_mentoria", "Curso/Mentoria"],
  ["academia", "Academia"],
  ["restaurante", "Restaurante"],
  ["outro", "Outro"]
];

const SOURCE_OPTIONS = [
  ["meta", "Meta Ad Library"],
  ["google", "Google Ads"],
  ["maps", "Google Maps"],
  ["linkedin", "LinkedIn"],
  ["manual", "Outro"]
];

const STEPS = [
  { icon: "01", label: "Lendo site com Firecrawl" },
  { icon: "02", label: "Medindo PageSpeed mobile" },
  { icon: "03", label: "Detectando stack no BuiltWith" },
  { icon: "04", label: "Consultando DNS e RDAP" },
  { icon: "05", label: "Buscando contato site/Apollo/Hunter" },
  { icon: "06", label: "Gerando score com Gemini Flash" },
  { icon: "07", label: "Salvando na Bandeja" }
];

export default function AddLeadForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [createdLead, setCreatedLead] = useState<Lead | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreatedLead(null);
    setIsSubmitting(true);
    setActiveStep(0);

    const stepTimer = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, STEPS.length - 1));
    }, 650);

    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = (await response.json().catch(() => null)) as { lead?: Lead; error?: string } | null;

      if (!response.ok || !result?.lead) {
        setError(result?.error ?? "Nao foi possivel adicionar o lead.");
        return;
      }

      setActiveStep(STEPS.length - 1);
      setCreatedLead(result.lead);
      window.setTimeout(() => router.push("/bandeja"), 2000);
    } finally {
      window.clearInterval(stepTimer);
      setIsSubmitting(false);
    }
  }

  const progress = createdLead ? 100 : Math.round(((activeStep + 1) / STEPS.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Adicionar lead</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Digite o dominio. O pipeline coleta, pesquisa, pontua e manda para aprovacao.
            </p>
          </div>
          <Button asChild variant="outline" className="h-11 rounded-2xl bg-white/60">
            <Link href="/apis">Ver APIs</Link>
          </Button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="liquid-card rounded-[1.6rem]">
          <CardHeader className="liquid-content">
            <CardTitle className="text-xl text-slate-950">Novo dominio</CardTitle>
            <CardDescription>Preencha apenas o necessario para iniciar o enriquecimento.</CardDescription>
          </CardHeader>
          <CardContent className="liquid-content grid gap-4 md:grid-cols-2">
            <Field label="Dominio">
              <Input
                required
                value={form.domain}
                onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))}
                placeholder="clinica-aurora.com.br"
                className="liquid-input h-12 rounded-2xl text-slate-950"
              />
            </Field>
            <Field label="Nome da empresa">
              <Input
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Clinica Aurora"
                className="liquid-input h-12 rounded-2xl text-slate-950"
              />
            </Field>
            <Field label="ICP">
              <Select value={form.icp} onValueChange={(value) => setForm((current) => ({ ...current, icp: value }))}>
                <SelectTrigger className="liquid-input h-12 rounded-2xl text-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/80 bg-white/90 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
                  <SelectGroup>
                    {ICP_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cidade">
              <Input
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                placeholder="Sao Paulo"
                className="liquid-input h-12 rounded-2xl text-slate-950"
              />
            </Field>
            <Field label="Fonte">
              <Select value={form.source} onValueChange={(value) => setForm((current) => ({ ...current, source: value }))}>
                <SelectTrigger className="liquid-input h-12 rounded-2xl text-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/80 bg-white/90 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
                  <SelectGroup>
                    {SOURCE_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field label="URL do anuncio">
              <Input
                value={form.ad_url}
                onChange={(event) => setForm((current) => ({ ...current, ad_url: event.target.value }))}
                placeholder="https://..."
                className="liquid-input h-12 rounded-2xl text-slate-950"
              />
            </Field>
          </CardContent>
          <CardFooter className="liquid-content flex flex-col items-stretch gap-3 p-5">
            {error ? (
              <Alert className="rounded-2xl border-rose-200/80 bg-rose-50/65 text-rose-700">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-14 rounded-2xl bg-emerald-600 font-semibold text-white shadow-[0_16px_40px_rgba(16,185,129,0.28)] hover:bg-emerald-700"
            >
              {isSubmitting ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
              {isSubmitting ? "Processando" : "Adicionar e enriquecer"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="liquid-card rounded-[1.6rem]">
          <CardHeader className="liquid-content">
            <CardTitle className="text-lg text-slate-950">
              {isSubmitting ? "Processando lead" : createdLead ? "Lead criado" : "Resumo"}
            </CardTitle>
            <CardDescription>
              {isSubmitting
                ? STEPS[activeStep]?.label
                : createdLead
                  ? "Redirecionando para a bandeja."
                  : "O enriquecimento começa depois de clicar no botao."}
            </CardDescription>
          </CardHeader>
          <CardContent className="liquid-content flex flex-col gap-4">
            {isSubmitting || createdLead ? (
              <>
                <Progress value={progress} className="h-2 bg-slate-200/80 [&>div]:bg-emerald-500" />
                <div className="flex flex-col gap-2">
                  {STEPS.map((step, index) => (
                    <div key={step.label} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/45 px-3 py-2 text-sm text-slate-600 shadow-inner backdrop-blur-xl">
                      <span className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-slate-950 font-mono text-[10px] font-bold text-white" aria-hidden="true">
                          {step.icon}
                        </span>
                        {step.label}
                      </span>
                      <span className={cn(
                        "rounded-full px-2 py-1 text-[11px] font-semibold",
                        createdLead || index < activeStep
                          ? "bg-emerald-50 text-emerald-700"
                          : index === activeStep && isSubmitting
                            ? "bg-slate-950 text-white"
                            : "bg-white/70 text-slate-400"
                      )}>
                        {createdLead || index < activeStep ? "feito" : index === activeStep && isSubmitting ? "agora" : "fila"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/70 bg-white/45 p-4 text-sm leading-relaxed text-slate-600 shadow-inner backdrop-blur-xl">
                Preencha os dados da empresa. Ao enviar, o sistema cria o lead, executa as etapas de enriquecimento e manda os aprovados para a Bandeja.
              </div>
            )}
            {createdLead ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{createdLead.company_name}</p>
                    <p className="text-sm text-slate-500">{createdLead.domain_root}</p>
                  </div>
                  <Badge className="rounded-full bg-emerald-600 text-white">{createdLead.total_score} score</Badge>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
      {label}
      {children}
    </label>
  );
}
