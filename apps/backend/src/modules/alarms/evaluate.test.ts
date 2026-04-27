import { describe, expect, test } from "vite-plus/test";

import { conditionGroupSchema } from "./condition-group.ts";
import { evaluateCondition, evaluateGroup } from "./evaluate.ts";

describe("evaluateCondition", () => {
  test("numeric comparisons", () => {
    const data = { price: 100, pct_change: 2.5 };
    expect(evaluateCondition({ metric: "price", operator: ">=", value: 100 }, data)).toBe(true);
    expect(evaluateCondition({ metric: "price", operator: ">", value: 100 }, data)).toBe(false);
    expect(evaluateCondition({ metric: "pct_change", operator: "==", value: 2.5 }, data)).toBe(
      true,
    );
  });

  test("boolean equality for limit flags", () => {
    const data = { limit_up: true, limit_down: false };
    expect(evaluateCondition({ metric: "limit_up", operator: "==", value: true }, data)).toBe(true);
    expect(evaluateCondition({ metric: "limit_down", operator: "==", value: true }, data)).toBe(
      false,
    );
  });

  test("missing metric is false", () => {
    expect(
      evaluateCondition({ metric: "volume_ratio_5m", operator: ">", value: 1 }, { price: 1 }),
    ).toBe(false);
  });
});

describe("evaluateGroup", () => {
  test("AND / OR", () => {
    const groupAnd = conditionGroupSchema.parse({
      op: "AND",
      conditions: [
        { metric: "price", operator: ">", value: 10 },
        { metric: "pct_change", operator: ">=", value: 0 },
      ],
    });
    expect(evaluateGroup(groupAnd, { price: 20, pct_change: 1 })).toBe(true);
    expect(evaluateGroup(groupAnd, { price: 20, pct_change: -1 })).toBe(false);

    const groupOr = conditionGroupSchema.parse({
      op: "OR",
      conditions: [
        { metric: "price", operator: ">", value: 1000 },
        { metric: "pct_change", operator: ">", value: 5 },
      ],
    });
    expect(evaluateGroup(groupOr, { price: 1, pct_change: 6 })).toBe(true);
    expect(evaluateGroup(groupOr, { price: 1, pct_change: 1 })).toBe(false);
  });
});
