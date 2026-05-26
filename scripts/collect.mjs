#!/usr/bin/env node

const args = parseArgs(process.argv.slice(2));
const baseUrl = process.env.LEAD_ENGINE_URL || "http://localhost:3000";

if (!args.domain || !args.name) {
  console.log("Uso:");
  console.log("  node scripts/collect.mjs --domain exemplo.com.br --name \"Empresa Exemplo\" --icp clinica_estetica --city \"Sao Paulo\" --source meta");
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/enrich`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    domain: args.domain,
    name: args.name,
    icp: args.icp || "outro",
    city: args.city || "",
    source: args.source || "manual",
    ad_url: args.ad_url || ""
  })
});

const result = await response.json().catch(() => null);

if (!response.ok) {
  console.error(result?.error || `Erro HTTP ${response.status}`);
  process.exit(1);
}

console.log("Lead enriquecido:");
console.log(JSON.stringify(result?.lead ?? result, null, 2));

function parseArgs(values) {
  return values.reduce((acc, value, index) => {
    if (!value.startsWith("--")) return acc;
    const key = value.slice(2);
    const next = values[index + 1];
    acc[key] = next && !next.startsWith("--") ? next : "true";
    return acc;
  }, {});
}
