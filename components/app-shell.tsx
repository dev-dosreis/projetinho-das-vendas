"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Pipeline",
    items: [
      { href: "/bandeja", label: "Bandeja", short: "B" },
      { href: "/adicionar", label: "Adicionar", short: "+" },
      { href: "/enviados", label: "Enviados", short: "E" }
    ]
  },
  {
    label: "Sistema",
    items: [
      { href: "/apis", label: "APIs", short: "A" }
    ]
  }
];

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className={cn(
        "min-h-screen bg-[#fafafa] text-slate-950 md:grid",
        collapsed ? "md:grid-cols-[88px_1fr]" : "md:grid-cols-[292px_1fr]"
      )}
    >
      <aside className="hidden min-h-screen border-r border-slate-200 bg-white md:block">
        <SidebarContent
          path={path}
          collapsed={collapsed}
          onToggle={() => setCollapsed((current) => !current)}
        />
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/bandeja" className="flex items-center gap-2">
            <BrandMark />
            <span className="text-sm font-semibold text-slate-950">Codnodo</span>
          </Link>
          <Button variant="outline" className="h-10 rounded-2xl bg-white px-4" onClick={() => setMobileOpen(true)}>
            Menu
          </Button>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[310px] border-slate-200 bg-white p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navegacao</SheetTitle>
            <SheetDescription>Menu principal do Lead Engine.</SheetDescription>
          </SheetHeader>
          <SidebarContent path={path} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="min-w-0 px-4 py-7 md:px-8 lg:px-10 xl:px-12">{children}</main>
    </div>
  );
}

function SidebarContent({
  path,
  collapsed,
  onToggle,
  onNavigate
}: {
  path: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("flex h-screen flex-col", collapsed ? "px-3 py-5" : "px-5 py-6")}>
      <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
        <Link href="/bandeja" className={cn("flex items-center gap-3", collapsed && "justify-center")} onClick={onNavigate}>
          <BrandMark />
          {!collapsed ? (
            <div>
              <p className="text-sm font-semibold leading-none text-slate-950">Codnodo</p>
              <p className="mt-1 text-xs text-slate-400">Lead Engine</p>
            </div>
          ) : null}
        </Link>

        {onToggle ? (
          <Button
            variant="ghost"
            className="h-9 rounded-xl px-3 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-950"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {collapsed ? ">" : "<"}
          </Button>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="mt-7 flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar..."
              className="h-12 rounded-2xl border-slate-200 bg-white pl-10 text-sm placeholder:text-slate-400"
            />
          </div>
          <Button asChild className="h-12 w-full rounded-2xl bg-emerald-600 text-white shadow-[0_12px_30px_rgba(22,163,74,0.18)] hover:bg-emerald-700">
            <Link href="/adicionar" onClick={onNavigate}>
              <span className="text-xl leading-none">+</span>
              Adicionar lead
            </Link>
          </Button>
        </div>
      ) : (
        <Button asChild className="mt-7 h-12 rounded-2xl bg-emerald-600 px-0 text-white hover:bg-emerald-700">
          <Link href="/adicionar" onClick={onNavigate} aria-label="Adicionar lead">+</Link>
        </Button>
      )}

      <nav className={cn("mt-7 flex flex-col", collapsed ? "gap-5" : "gap-7")}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            {!collapsed ? (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                {group.label}
              </p>
            ) : null}

            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = path === item.href;

                return (
                  <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    className={cn(
                      "relative h-11 rounded-2xl text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-0" : "justify-start px-3",
                      active
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                    )}
                  >
                    <Link href={item.href} onClick={onNavigate} aria-label={item.label}>
                      {!collapsed && active ? (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-emerald-500" />
                      ) : null}
                      <span className={cn(collapsed && "font-mono text-sm")}>{collapsed ? item.short : item.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("mt-auto", collapsed ? "flex justify-center" : "")}>
        {!collapsed ? (
          <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-3">
              <Avatar />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">Lucas Dos Reis</p>
                <p className="truncate text-xs text-slate-400">workspace local</p>
              </div>
              <span className="ml-auto size-2 rounded-full bg-emerald-300" />
            </div>
          </div>
        ) : (
          <Avatar />
        )}
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-semibold text-emerald-700">
      C
    </div>
  );
}

function Avatar() {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
      LR
    </div>
  );
}
