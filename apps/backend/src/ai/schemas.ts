import { z } from "zod";

export const ConditionSchema = z.object({
  metric: z.enum([
    "price",
    "pct_change",
    "volume",
    "turnover",
    "limit_up",
    "limit_down",
    "volume_ratio_5m",
    "price_change_5m",
  ]),
  operator: z.enum([">=", "<=", ">", "<", "==", "!="]),
  value: z.number().finite(),
});

export const ConditionGroupSchema = z.object({
  operator: z.enum(["AND", "OR"]),
  conditions: z.array(ConditionSchema).min(1).max(5),
});

export const ParsedDraftSchema = z.object({
  symbol: z.string().min(1).max(64),
  symbolName: z.string().min(1).max(64),
  conditionGroup: ConditionGroupSchema,
  cooldownSeconds: z.number().int().min(0).max(86400).default(900),
  notifyLabel: z.string().max(64).nullable().optional(),
  notifyTier: z.enum(["standard", "emphasis"]).default("standard"),
});

export const ParserOutputSchema = z.object({
  textExplanation: z.string().min(1),
  draft: ParsedDraftSchema.nullable(),
  errorCode: z.enum(["infra_error"]).optional(),
});
