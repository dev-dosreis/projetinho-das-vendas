import "server-only";

export function getMonthlyStackCostUsd() {
  const parsed = Number(process.env.MONTHLY_STACK_COST_USD ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
