export type Operator = ">=" | "<=" | ">" | "<" | "==" | "!=";

export type Metric =
  | "price"
  | "pct_change"
  | "volume"
  | "turnover"
  | "limit_up"
  | "limit_down"
  | "volume_ratio_5m"
  | "price_change_5m";

export type NotifyTier = "standard" | "emphasis";

export interface Condition {
  metric: Metric;
  operator: Operator;
  value: number;
}

export interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: Condition[];
}

export interface AlarmSpec {
  id: string;
  userId: string;
  symbol: string;
  conditionGroup: ConditionGroup;
  cooldownSeconds: number;
  enabled: boolean;
  notifyLabel: string | null;
  notifyTier: NotifyTier;
  lastTriggeredAt: Date | null;
}
