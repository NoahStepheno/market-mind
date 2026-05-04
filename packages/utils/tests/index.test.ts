import { expect, test } from "vite-plus/test";

import { OPERATORS, PRESET_TEMPLATES, SUPPORTED_METRICS } from "../src/constants.ts";
import type { DerivedMetrics, Tick } from "../src/tick.ts";
import {
  type AlarmSpec,
  type Condition,
  type ConditionGroup,
  type Metric,
  type NotifyTier,
  type Operator,
} from "../src/types.ts";

test("SUPPORTED_METRICS has 8 entries", () => {
  expect(SUPPORTED_METRICS).toHaveLength(8);
  expect(SUPPORTED_METRICS[0].value).toBe("price");
  expect(SUPPORTED_METRICS[7].value).toBe("price_change_5m");
});

test("OPERATORS has 6 entries", () => {
  expect(OPERATORS).toHaveLength(6);
  const values = OPERATORS.map((o) => o.value);
  expect(values).toEqual([">=", "<=", ">", "<", "==", "!="]);
});

test("PRESET_TEMPLATES has 3 presets", () => {
  expect(PRESET_TEMPLATES).toHaveLength(3);
  expect(PRESET_TEMPLATES[0].id).toBe("price-breakout");
});

test("type imports compile without error", () => {
  const metric: Metric = "price";
  const op: Operator = ">=";
  const tier: NotifyTier = "standard";

  const condition: Condition = { metric, operator: op, value: 100 };
  const group: ConditionGroup = { operator: "AND", conditions: [condition] };

  const spec: AlarmSpec = {
    id: "test",
    userId: "u1",
    symbol: "000001.SZ",
    conditionGroup: group,
    cooldownSeconds: 900,
    enabled: true,
    notifyLabel: null,
    notifyTier: tier,
    lastTriggeredAt: null,
  };

  const tick: Tick = {
    symbol: "000001.SZ",
    price: 10.5,
    pctChange: 2.5,
    volume: 1000000,
    turnover: 10500000,
    limitUp: false,
    limitDown: false,
    volumeRatio5m: 1.2,
    priceChange5m: 0.3,
    timestamp: new Date().toISOString(),
  };

  const derived: DerivedMetrics = {
    symbol: "000001.SZ",
    vwap: 10.45,
    avgVolume5m: 800000,
    priceStdDev5m: 0.15,
    timestamp: new Date().toISOString(),
  };

  expect(spec.symbol).toBe("000001.SZ");
  expect(tick.price).toBe(10.5);
  expect(derived.vwap).toBe(10.45);
});
