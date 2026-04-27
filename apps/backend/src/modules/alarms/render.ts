import type { ConditionGroup } from "./condition-group.ts";

function formatLeaf(cond: ConditionGroup["conditions"][number]): string {
  const v = typeof cond.value === "boolean" ? String(cond.value) : String(cond.value);
  return `${cond.metric} ${cond.operator} ${v}`;
}

export function summarizeConditionGroup(group: ConditionGroup): string {
  const parts = group.conditions.map(formatLeaf);
  return group.op === "AND" ? parts.join(" 且 ") : parts.join(" 或 ");
}

export function buildNotificationCopy(input: {
  symbol: string;
  notifyLabel: string | null;
  conditionSummary: string;
  priceSnapshot?: number;
}): { title: string; body: string } {
  const pricePart =
    input.priceSnapshot !== undefined && Number.isFinite(input.priceSnapshot)
      ? String(input.priceSnapshot)
      : "—";
  const headline = `${input.symbol} ${pricePart}`;
  const body = `【${headline}】｜【${input.conditionSummary}】｜你设的条件触发了`;
  const title =
    input.notifyLabel && input.notifyLabel.trim().length > 0
      ? `${input.notifyLabel.trim()} · ${input.symbol}`
      : `${input.symbol} 告警`;
  return { title, body };
}
