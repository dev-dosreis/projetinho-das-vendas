import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import AppShell from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codnodo Lead Engine",
  description: "Buying Signal System - encontre leads que ja estao comprando"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster
          theme="light"
          toastOptions={{
            style: {
              background: "rgba(255, 255, 255, 0.86)",
              border: "1px solid rgba(226, 232, 240, 0.9)",
              color: "#0f172a",
              backdropFilter: "blur(18px)"
            }
          }}
        />
      </body>
    </html>
  );
}
