import { describe, expect, test } from "vite-plus/test";

import {
  assertConditionGroupLimits,
  conditionGroupSchema,
  parseConditionGroupJson,
} from "./condition-group.ts";

const allMetrics = [
  "price",
  "pct_change",
  "volume",
  "turnover",
  "volume_ratio_5m",
  "price_change_5m",
  "limit_up",
  "limit_down",
] as const;

const validOperators = [">", ">=", "<", "<=", "=="] as const;

function makeGroup(op: "AND" | "OR", metrics: readonly string[] = allMetrics) {
  return {
    op,
    conditions: metrics.map((metric) => ({
      metric,
      operator: ">" as const,
      value: 100,
    })),
  };
}

// Covers: 3.1-UNIT-001 @P0
// Given all 8 valid metric types
// When parsed with AND group
// Then conditionGroupSchema validates successfully
describe("conditionGroupSchema - AND group with all metrics", () => {
  test("3.1-UNIT-001 @P0: all 8 metric types accepted with AND group", () => {
    const group = makeGroup("AND");

    // Given - group contains all 8 metrics with AND operator
    // When - schema parses the group
    const result = conditionGroupSchema.safeParse(group);

    // Then - validation succeeds
    expect(result.success).toBe(true);
    expect(result.success && result.data.conditions).toHaveLength(8);
  });
});

// Covers: 3.1-UNIT-001b @P0
// Given all 8 valid metric types
// When parsed with OR group
// Then conditionGroupSchema validates successfully
describe("conditionGroupSchema - OR group with all metrics", () => {
  test("3.1-UNIT-001b @P0: all 8 metric types accepted with OR group", () => {
    const group = makeGroup("OR");

    // Given - group contains all 8 metrics with OR operator
    // When - schema parses the group
    const result = conditionGroupSchema.safeParse(group);

    // Then - validation succeeds
    expect(result.success).toBe(true);
    expect(result.success && result.data.conditions).toHaveLength(8);
  });
});

// Covers: 3.1-UNIT-002 @P0
// Given a condition group with an unknown/invalid metric
// When conditionGroupSchema parses it
// Then validation fails
describe("conditionGroupSchema - invalid metrics", () => {
  test("3.1-UNIT-002 @P0: unknown metric rejected", () => {
    const group = {
      op: "AND",
      conditions: [{ metric: "invalid_metric", operator: ">", value: 100 }],
    };

    // Given - group contains an invalid metric name
    // When - schema parses the group
    const result = conditionGroupSchema.safeParse(group);

    // Then - validation fails
    expect(result.success).toBe(false);
  });

  test("3.1-UNIT-002 @P0: empty string metric rejected", () => {
    const group = {
      op: "AND",
      conditions: [{ metric: "", operator: ">", value: 100 }],
    };

    const result = conditionGroupSchema.safeParse(group);

    expect(result.success).toBe(false);
  });
});

// Covers: 3.1-UNIT-002b @P0
// Given a condition with an invalid operator
// When conditionGroupSchema parses it
// Then validation fails
describe("conditionGroupSchema - invalid operators", () => {
  test("3.1-UNIT-002b @P0: invalid operator rejected", () => {
    const group = {
      op: "AND",
      conditions: [{ metric: "price", operator: "!=", value: 100 }],
    };

    // Given - group contains an unsupported operator
    // When - schema parses the group
    const result = conditionGroupSchema.safeParse(group);

    // Then - validation fails
    expect(result.success).toBe(false);
  });

  test("3.1-UNIT-002b @P0: empty string operator rejected", () => {
    const group = {
      op: "AND",
      conditions: [{ metric: "price", operator: "", value: 100 }],
    };

    const result = conditionGroupSchema.safeParse(group);

    expect(result.success).toBe(false);
  });

  test("3.1-UNIT-002b @P0: all valid operators accepted", () => {
    for (const op of validOperators) {
      const group = {
        op: "AND" as const,
        conditions: [{ metric: "price", operator: op, value: 100 }],
      };
      const result = conditionGroupSchema.safeParse(group);
      expect(result.success).toBe(true);
    }
  });
});

// Covers: empty conditions array
// Given a condition group with an empty conditions array
// When conditionGroupSchema parses it
// Then validation fails (min 1 condition required)
describe("conditionGroupSchema - empty conditions", () => {
  test("empty conditions array rejected (min 1)", () => {
    const group = { op: "AND", conditions: [] };

    // Given - group has zero conditions
    // When - schema parses the group
    const result = conditionGroupSchema.safeParse(group);

    // Then - validation fails because min(1)
    expect(result.success).toBe(false);
  });
});

// Covers: assertConditionGroupLimits
// Given a condition group that exceeds the max allowed leaves
// When assertConditionGroupLimits is called
// Then an error is thrown
describe("assertConditionGroupLimits", () => {
  test("throws when conditions exceed max leaves (default 5)", () => {
    // Create a group with 6 conditions (exceeds default max of 5)
    const group = {
      op: "AND" as const,
      conditions: allMetrics.slice(0, 6).map((metric) => ({
        metric,
        operator: ">" as const,
        value: 100,
      })),
    };

    // Given - group has 6 conditions (exceeds default limit of 5)
    // When - limits are checked
    // Then - error is thrown
    expect(() => assertConditionGroupLimits(group)).toThrow(
      "condition_group exceeds max leaves (5)",
    );
  });

  test("does not throw when conditions are within limit", () => {
    const group = {
      op: "AND" as const,
      conditions: allMetrics.slice(0, 3).map((metric) => ({
        metric,
        operator: ">" as const,
        value: 100,
      })),
    };

    // Given - group has 3 conditions (within limit)
    // When - limits are checked
    // Then - no error is thrown
    expect(() => assertConditionGroupLimits(group)).not.toThrow();
  });
});

// Covers: parseConditionGroupJson integration
// Given valid JSON input
// When parseConditionGroupJson is called
// Then it returns the parsed ConditionGroup
describe("parseConditionGroupJson", () => {
  test("parses valid condition group", () => {
    const input = {
      op: "AND",
      conditions: [
        { metric: "price", operator: ">", value: 100 },
        { metric: "volume", operator: ">=", value: 5000 },
      ],
    };

    // Given - valid group input
    // When - parsed via parseConditionGroupJson
    const result = parseConditionGroupJson(input);

    // Then - returns the parsed group
    expect(result.op).toBe("AND");
    expect(result.conditions).toHaveLength(2);
    expect(result.conditions[0].metric).toBe("price");
    expect(result.conditions[1].metric).toBe("volume");
  });

  test("throws for invalid shape", () => {
    // Given - invalid group input (missing conditions)
    // When - parsed via parseConditionGroupJson
    // Then - error is thrown
    expect(() => parseConditionGroupJson({ op: "AND" })).toThrow("invalid condition_group shape");
  });

  test("throws when exceeds max leaves", () => {
    const input = {
      op: "AND",
      conditions: allMetrics.map((metric) => ({
        metric,
        operator: ">" as const,
        value: 100,
      })),
    };

    // Given - group has 8 conditions (exceeds default max of 5)
    // When - parsed via parseConditionGroupJson
    // Then - error is thrown for exceeding limits
    expect(() => parseConditionGroupJson(input)).toThrow("condition_group exceeds max leaves (5)");
  });

  test("accepts boolean values for conditions", () => {
    const input = {
      op: "OR",
      conditions: [{ metric: "limit_up", operator: "==", value: true }],
    };

    // Given - condition with boolean value
    // When - parsed
    const result = parseConditionGroupJson(input);

    // Then - boolean is accepted
    expect(result.conditions[0].value).toBe(true);
  });
});
