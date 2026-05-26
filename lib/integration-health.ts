import "server-only";
import dns from "node:dns/promises";

export type IntegrationState = "ready" | "missing" | "ok" | "error" | "skipped";

export type IntegrationHealthItem = {
  id: string;
  name: string;
  category: "Coleta" | "Pesquisa" | "Contato" | "Infra";
  description: string;
  envNames: string[];
  configured: boolean;
  state: IntegrationState;
  label: string;
  detail: string;
  quotaSafe: boolean;
};

type IntegrationDefinition = {
  id: string;
  name: string;
  category: IntegrationHealthItem["category"];
  description: string;
  envNames: string[];
  quotaSafe: boolean;
  liveCheck?: () => Promise<Pick<IntegrationHealthItem, "state" | "label" | "detail">>;
  defaultConfigured?: boolean;
};

const DEFINITIONS: IntegrationDefinition[] = [
  {
    id: "firecrawl",
    name: "Firecrawl",
    category: "Coleta",
    description: "Lê o site e transforma a landing page em Markdown.",
    envNames: ["FIRECRAWL_API_KEY", "FIRECRAWL_KEY"],
    quotaSafe: false
  },
  {
    id: "pagespeed",
    name: "PageSpeed",
    category: "Coleta",
    description: "Mede performance mobile e SEO.",
    envNames: ["PAGESPEED_API_KEY", "PSI_KEY"],
    quotaSafe: true,
    liveCheck: checkPageSpeed
  },
  {
    id: "builtwith",
    name: "BuiltWith",
    category: "Coleta",
    description: "Detecta stack, pixel, CRM e ferramentas de marketing.",
    envNames: ["BUILTWITH_API_KEY", "BUILTWITH_KEY"],
    quotaSafe: false
  },
  {
    id: "rdap",
    name: "RDAP Registro.br",
    category: "Pesquisa",
    description: "Consulta domínio .com.br e idade do domínio.",
    envNames: ["RDAP_BASE_URL"],
    quotaSafe: true,
    defaultConfigured: true,
    liveCheck: checkRdap
  },
  {
    id: "dns",
    name: "DNS / MX",
    category: "Pesquisa",
    description: "Descobre provedor de e-mail pelo MX.",
    envNames: ["DNS_LOOKUP_API_KEY"],
    quotaSafe: true,
    defaultConfigured: true,
    liveCheck: checkDns
  },
  {
    id: "gemini",
    name: "Gemini Flash",
    category: "Pesquisa",
    description: "Gera score, diagnóstico e mensagem de WhatsApp.",
    envNames: ["GEMINI_API_KEY", "GEMINI_KEY"],
    quotaSafe: true,
    liveCheck: checkGemini
  },
  {
    id: "apollo",
    name: "Apollo",
    category: "Contato",
    description: "Fallback para encontrar decisor, telefone e e-mail.",
    envNames: ["APOLLO_API_KEY", "APOLLO_COMPANY_SEARCH_API_KEY", "APOLLO_ORGANIZATION_ENRICH_API_KEY"],
    quotaSafe: false
  },
  {
    id: "hunter",
    name: "Hunter",
    category: "Contato",
    description: "Fallback para e-mail de domínio e enriquecimento.",
    envNames: ["HUNTER_API_KEY", "HUNTER_KEY"],
    quotaSafe: true,
    liveCheck: checkHunter
  },
  {
    id: "alerts",
    name: "Alertas",
    category: "Infra",
    description: "Webhook para avisar quando o pipeline falhar.",
    envNames: ["ALERT_WEBHOOK_URL"],
    quotaSafe: false
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "Infra",
    description: "Banco, leitura da bandeja e escrita privilegiada via API.",
    envNames: ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    quotaSafe: false
  }
];

export async function getIntegrationHealth({ live = false }: { live?: boolean } = {}) {
  const items = await Promise.all(
    DEFINITIONS.map(async (definition) => {
      const configured = definition.defaultConfigured || definition.envNames.some((name) => isConfigured(process.env[name]));

      if (!configured) {
        return toItem(definition, {
          configured: false,
          state: "missing",
          label: "Falta configurar",
          detail: "Adicione a variável no servidor."
        });
      }

      if (!live) {
        return toItem(definition, {
          configured: true,
          state: "ready",
          label: "Configurada",
          detail: "Chave presente no servidor. Valor oculto por segurança."
        });
      }

      if (!definition.liveCheck) {
        return toItem(definition, {
          configured: true,
          state: "skipped",
          label: "Não testada",
          detail: definition.quotaSafe
            ? "Sem teste automático configurado."
            : "Teste ao vivo pulado para preservar créditos/quota."
        });
      }

      try {
        const result = await definition.liveCheck();
        return toItem(definition, { configured: true, ...result });
      } catch (error) {
        return toItem(definition, {
          configured: true,
          state: "error",
          label: "Erro",
          detail: error instanceof Error ? error.message : "Falha no teste ao vivo."
        });
      }
    })
  );

  const configured = items.filter((item) => item.configured).length;
  const missing = items.filter((item) => !item.configured).length;
  const ok = items.filter((item) => item.state === "ok" || item.state === "ready" || item.state === "skipped").length;

  return {
    checkedAt: new Date().toISOString(),
    live,
    summary: {
      total: items.length,
      configured,
      missing,
      ok
    },
    items
  };
}

function toItem(
  definition: IntegrationDefinition,
  status: Pick<IntegrationHealthItem, "configured" | "state" | "label" | "detail">
): IntegrationHealthItem {
  return {
    id: definition.id,
    name: definition.name,
    category: definition.category,
    description: definition.description,
    envNames: definition.envNames,
    quotaSafe: definition.quotaSafe,
    ...status
  };
}

function isConfigured(value: string | undefined) {
  return Boolean(value && !value.includes("replace_me") && !value.includes("SEU_PROJECT_REF"));
}

async function checkPageSpeed() {
  const apiKey = process.env.PAGESPEED_API_KEY ?? process.env.PSI_KEY;
  const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  url.searchParams.set("url", "https://example.com");
  url.searchParams.set("strategy", "mobile");
  url.searchParams.append("category", "performance");
  url.searchParams.set("key", apiKey ?? "");

  const response = await fetch(url, { signal: AbortSignal.timeout(18000) });
  if (!response.ok) return { state: "error" as const, label: "Erro", detail: `HTTP ${response.status}` };
  return { state: "ok" as const, label: "Online", detail: "Teste mobile executado com sucesso." };
}

async function checkRdap() {
  const baseUrl = process.env.RDAP_BASE_URL ?? "https://rdap.registro.br";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/domain/nic.br`, {
    headers: { Accept: "application/rdap+json, application/json" },
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) return { state: "error" as const, label: "Erro", detail: `HTTP ${response.status}` };
  return { state: "ok" as const, label: "Online", detail: "Registro.br respondeu consulta RDAP." };
}

async function checkDns() {
  const records = await dns.resolveMx("google.com");
  return records.length
    ? { state: "ok" as const, label: "Online", detail: "Resolução MX funcionando no servidor." }
    : { state: "error" as const, label: "Erro", detail: "Nenhum MX retornado." };
}

async function checkGemini() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GEMINI_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey ?? ""
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Responda apenas: ok" }] }],
      generationConfig: { temperature: 0 }
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) return { state: "error" as const, label: "Erro", detail: `HTTP ${response.status}` };
  return { state: "ok" as const, label: "Online", detail: `${model} respondeu ao teste.` };
}

async function checkHunter() {
  const apiKey = process.env.HUNTER_API_KEY ?? process.env.HUNTER_KEY;
  const response = await fetch(`https://api.hunter.io/v2/account?api_key=${apiKey}`, {
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) return { state: "error" as const, label: "Erro", detail: `HTTP ${response.status}` };
  return { state: "ok" as const, label: "Online", detail: "Conta Hunter respondeu." };
}
