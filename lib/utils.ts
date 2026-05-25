import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 50) return "text-slate-700";
  return "text-rose-600";
}

export function scoreBg(score: number): string {
  if (score >= 70) return "border-emerald-200/80";
  if (score >= 50) return "border-slate-200/80";
  return "border-rose-200/80";
}

export function scoreRing(score: number): string {
  if (score >= 70) return "hover:ring-emerald-300/70";
  if (score >= 50) return "hover:ring-slate-300/70";
  return "hover:ring-rose-300/70";
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

export function snoozeDate(days = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export const REJECTION_REASONS = [
  "Nao tem WhatsApp visivel",
  "Site institucional sem conversao",
  "Anuncio muito antigo",
  "Fora do ICP",
  "Sem decisor identificavel",
  "Concorrente nosso",
  "Empresa muito pequena",
  "Outro motivo"
];
