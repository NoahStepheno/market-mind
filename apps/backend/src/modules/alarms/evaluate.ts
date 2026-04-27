import type { ConditionGroup, ConditionLeaf } from "./condition-group.ts";

export type MarketSnapshot = Record<string, unknown>;

function readMetric(data: MarketSnapshot, metric: ConditionLeaf["metric"]): unknown {
  if (Object.prototype.hasOwnProperty.call(data, metric)) {
    return data[metric];
  }
  return undefined;
}

function compare(op: ConditionLeaf["operator"], left: number, right: number): boolean {
  switch (op) {
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    case "==":
      return left === right;
    default:
      return false;
  }
}

/**
 * Evaluates a single leaf against a flat snapshot (Tick + derived metrics, PRD §4.2–4.3).
 */
export function evaluateCondition(cond: ConditionLeaf, data: MarketSnapshot): boolean {
  const actual = readMetric(data, cond.metric);
  if (actual === undefined || actual === null) {
    return false;
  }

  if (typeof cond.value === "boolean") {
    if (cond.operator !== "==") {
      return false;
    }
    return typeof actual === "boolean" && actual === cond.value;
  }

  if (typeof cond.value !== "number") {
    return false;
  }

  const n = typeof actual === "number" ? actual : Number(actual);
  if (!Number.isFinite(n)) {
    return false;
  }

  return compare(cond.operator, n, cond.value);
}

/**
 * Single-level AND/OR over leaves only (alarm-realtime-technical §3.2.1).
 */
export function evaluateGroup(group: ConditionGroup, data: MarketSnapshot): boolean {
  if (group.op === "AND") {
    return group.conditions.every((c) => evaluateCondition(c, data));
  }
  return group.conditions.some((c) => evaluateCondition(c, data));
}
