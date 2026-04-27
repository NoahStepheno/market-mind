import { z } from "zod";

const operatorSchema = z.enum([">", ">=", "<", "<=", "=="]);

const metricSchema = z.enum([
  "price",
  "pct_change",
  "volume",
  "turnover",
  "volume_ratio_5m",
  "price_change_5m",
  "limit_up",
  "limit_down",
]);

const conditionSchema = z.object({
  metric: metricSchema,
  operator: operatorSchema,
  value: z.union([z.number(), z.boolean()]),
});

export const conditionGroupSchema = z.object({
  op: z.enum(["AND", "OR"]),
  conditions: z.array(conditionSchema).min(1),
});

export type ConditionGroup = z.infer<typeof conditionGroupSchema>;
export type ConditionLeaf = z.infer<typeof conditionSchema>;

export function getMaxConditionLeaves(): number {
  const raw = process.env.ALARM_MAX_CONDITION_LEAVES;
  const n = raw ? Number.parseInt(raw, 10) : 5;
  if (!Number.isFinite(n) || n < 1) {
    return 5;
  }
  return Math.min(n, 50);
}

export function assertConditionGroupLimits(group: ConditionGroup): void {
  const max = getMaxConditionLeaves();
  if (group.conditions.length > max) {
    throw new Error(`condition_group exceeds max leaves (${max})`);
  }
}

export function parseConditionGroupJson(value: unknown): ConditionGroup {
  const parsed = conditionGroupSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("invalid condition_group shape");
  }
  assertConditionGroupLimits(parsed.data);
  return parsed.data;
}
