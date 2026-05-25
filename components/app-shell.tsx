"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, PlusCircle, Send, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/bandeja", icon: Inbox, label: "Bandeja" },
  { href: "/enviados", icon: Send, label: "Enviados" },
  { href: "/adicionar", icon: PlusCircle, label: "Adicionar" }
];

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/55 shadow-[0_12px_50px_rgba(15,23,42,0.07)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/bandeja" className="flex items-center gap-2.5">
            <div className="liquid-pill flex size-9 items-center justify-center rounded-2xl text-emerald-600">
              <Zap className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-slate-950">Codnodo</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600">
                Lead Engine v3
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map(({ href, icon: Icon, label }) => (
              <Button
                key={href}
                asChild
                variant="ghost"
                className={cn(
                  "h-10 rounded-2xl px-4 text-sm font-medium transition-all",
                  path === href
                    ? "liquid-pill text-emerald-700 hover:text-emerald-700"
                    : "text-slate-500 hover:bg-white/55 hover:text-slate-950"
                )}
              >
                <Link href={href}>
                  <Icon data-icon="inline-start" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
