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

  // 4.2-UNIT-006 @P0 – All 8 metric types return true when condition matches
  test("4.2-UNIT-006 @P0: evaluates all 8 metric types correctly", () => {
    // Given a snapshot with all metric values present
    const data = {
      price: 25.5,
      pct_change: 3.2,
      volume: 1_000_000,
      turnover: 25_500_000,
      volume_ratio_5m: 1.8,
      price_change_5m: 0.75,
      limit_up: true,
      limit_down: false,
    };

    // When each metric is evaluated with a matching condition, then all return true
    expect(evaluateCondition({ metric: "price", operator: ">", value: 20 }, data)).toBe(true);
    expect(evaluateCondition({ metric: "pct_change", operator: ">=", value: 3 }, data)).toBe(true);
    expect(evaluateCondition({ metric: "volume", operator: "==", value: 1_000_000 }, data)).toBe(
      true,
    );
    expect(evaluateCondition({ metric: "turnover", operator: "<", value: 30_000_000 }, data)).toBe(
      true,
    );
    expect(evaluateCondition({ metric: "volume_ratio_5m", operator: ">", value: 1.5 }, data)).toBe(
      true,
    );
    expect(evaluateCondition({ metric: "price_change_5m", operator: ">=", value: 0.5 }, data)).toBe(
      true,
    );
    expect(evaluateCondition({ metric: "limit_up", operator: "==", value: true }, data)).toBe(true);
    expect(evaluateCondition({ metric: "limit_down", operator: "==", value: false }, data)).toBe(
      true,
    );
  });

  // 4.2-UNIT-006b @P0 – Missing metric returns false, not an error
  test("4.2-UNIT-006b @P0: missing metric in snapshot returns false", () => {
    // Given an empty snapshot
    const data: Record<string, unknown> = {};

    // When evaluating a condition against a metric not in the snapshot, then it returns false
    expect(evaluateCondition({ metric: "price", operator: ">", value: 10 }, data)).toBe(false);
    expect(evaluateCondition({ metric: "limit_up", operator: "==", value: true }, data)).toBe(
      false,
    );
  });

  // 4.2-UNIT-006c @P1 – Boolean value with non-== operator returns false
  test("4.2-UNIT-006c @P1: boolean metric with non-equality operator returns false", () => {
    // Given a snapshot with boolean metric
    const data = { limit_up: true };

    // When using a comparison operator on a boolean value, then it returns false
    expect(evaluateCondition({ metric: "limit_up", operator: ">", value: true }, data)).toBe(false);
    expect(evaluateCondition({ metric: "limit_up", operator: ">=", value: true }, data)).toBe(
      false,
    );
    expect(evaluateCondition({ metric: "limit_up", operator: "<", value: true }, data)).toBe(false);
    expect(evaluateCondition({ metric: "limit_up", operator: "<=", value: true }, data)).toBe(
      false,
    );
  });

  // 4.2-UNIT-006d @P1 – Non-finite number in snapshot returns false
  test("4.2-UNIT-006d @P1: non-finite number in snapshot returns false", () => {
    // Given snapshots with non-finite values
    // When evaluating, then it returns false
    expect(evaluateCondition({ metric: "price", operator: ">", value: 10 }, { price: NaN })).toBe(
      false,
    );
    expect(
      evaluateCondition({ metric: "price", operator: ">", value: 10 }, { price: Infinity }),
    ).toBe(false);
    expect(
      evaluateCondition({ metric: "price", operator: ">", value: 10 }, { price: -Infinity }),
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

  // 4.2-UNIT-007 @P0 – AND group: all conditions must pass
  test("4.2-UNIT-007 @P0: AND group returns false when one condition fails", () => {
    // Given an AND group with 3 conditions
    const group = conditionGroupSchema.parse({
      op: "AND",
      conditions: [
        { metric: "price", operator: ">", value: 10 },
        { metric: "volume", operator: ">", value: 500_000 },
        { metric: "pct_change", operator: ">=", value: 1 },
      ],
    });
    // When one condition fails, then the group returns false
    expect(evaluateGroup(group, { price: 20, volume: 600_000, pct_change: 0.5 })).toBe(false);
    // When all match, then true
    expect(evaluateGroup(group, { price: 20, volume: 600_000, pct_change: 1.5 })).toBe(true);
  });

  // 4.2-UNIT-008 @P0 – OR group: any condition triggers
  test("4.2-UNIT-008 @P0: OR group returns true when only one condition passes", () => {
    // Given an OR group with 3 conditions
    const group = conditionGroupSchema.parse({
      op: "OR",
      conditions: [
        { metric: "price", operator: ">", value: 100 },
        { metric: "pct_change", operator: ">", value: 5 },
        { metric: "volume_ratio_5m", operator: ">=", value: 2 },
      ],
    });
    // When only one passes, then true
    expect(evaluateGroup(group, { price: 50, pct_change: 6, volume_ratio_5m: 1.0 })).toBe(true);
    // When none pass, then false
    expect(evaluateGroup(group, { price: 50, pct_change: 1, volume_ratio_5m: 0.5 })).toBe(false);
  });

  // Single condition in AND/OR group works correctly
  test("single-condition AND group evaluates correctly", () => {
    const group = conditionGroupSchema.parse({
      op: "AND",
      conditions: [{ metric: "price", operator: ">", value: 10 }],
    });
    expect(evaluateGroup(group, { price: 20 })).toBe(true);
    expect(evaluateGroup(group, { price: 5 })).toBe(false);
  });

  test("single-condition OR group evaluates correctly", () => {
    const group = conditionGroupSchema.parse({
      op: "OR",
      conditions: [{ metric: "price", operator: "<", value: 10 }],
    });
    expect(evaluateGroup(group, { price: 5 })).toBe(true);
    expect(evaluateGroup(group, { price: 15 })).toBe(false);
  });
});
