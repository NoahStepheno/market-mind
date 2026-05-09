import { describe, expect, test } from "vite-plus/test";

import { conditionGroupSchema } from "./condition-group.ts";
import { buildNotificationCopy, summarizeConditionGroup } from "./render.ts";

describe("summarizeConditionGroup", () => {
  test("joins AND conditions with Chinese '且'", () => {
    // Given an AND group with two numeric conditions
    const group = conditionGroupSchema.parse({
      op: "AND",
      conditions: [
        { metric: "price", operator: ">", value: 10 },
        { metric: "pct_change", operator: ">=", value: 2 },
      ],
    });

    // When summarizing, then parts are joined with '且'
    expect(summarizeConditionGroup(group)).toBe("price > 10 且 pct_change >= 2");
  });

  test("joins OR conditions with Chinese '或'", () => {
    // Given an OR group with two conditions
    const group = conditionGroupSchema.parse({
      op: "OR",
      conditions: [
        { metric: "limit_up", operator: "==", value: true },
        { metric: "price", operator: "<", value: 5 },
      ],
    });

    // When summarizing, then parts are joined with '或'
    expect(summarizeConditionGroup(group)).toBe("limit_up == true 或 price < 5");
  });

  test("formats a single condition without joiner", () => {
    // Given a group with a single condition
    const group = conditionGroupSchema.parse({
      op: "AND",
      conditions: [{ metric: "volume", operator: ">", value: 1000000 }],
    });

    // When summarizing, then the result has no joiner
    expect(summarizeConditionGroup(group)).toBe("volume > 1000000");
  });
});

describe("buildNotificationCopy", () => {
  // 4.3-UNIT-001 @P2 – Push payload includes all required fields
  test("4.3-UNIT-001 @P2: returns title and body with all required fields", () => {
    // Given valid input with all fields present
    const input = {
      symbol: "600519",
      notifyLabel: "贵州茅台新高",
      conditionSummary: "price > 1800",
      priceSnapshot: 1850.5,
    };

    // When building notification copy, then result has title and body
    const result = buildNotificationCopy(input);

    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("body");
    expect(typeof result.title).toBe("string");
    expect(typeof result.body).toBe("string");
    // Title includes label and symbol
    expect(result.title).toContain("贵州茅台新高");
    expect(result.title).toContain("600519");
    // Body includes symbol, price, and condition summary
    expect(result.body).toContain("600519");
    expect(result.body).toContain("1850.5");
    expect(result.body).toContain("price > 1800");
  });

  test("uses dash when priceSnapshot is omitted", () => {
    // Given input without a price snapshot
    const input = {
      symbol: "000001",
      notifyLabel: null,
      conditionSummary: "pct_change > 5",
    };

    // When building notification copy, then price is shown as dash
    const result = buildNotificationCopy(input);
    expect(result.body).toContain("—");
    // Title falls back to symbol + 告警
    expect(result.title).toBe("000001 告警");
  });

  test("uses dash when priceSnapshot is non-finite", () => {
    // Given input with NaN price
    const input = {
      symbol: "000001",
      notifyLabel: "监控",
      conditionSummary: "volume > 1000000",
      priceSnapshot: NaN,
    };

    // When building notification copy, then price is shown as dash
    const result = buildNotificationCopy(input);
    expect(result.body).toContain("—");
  });

  test("trims whitespace from notifyLabel", () => {
    // Given input with a padded label
    const input = {
      symbol: "300750",
      notifyLabel: "  宁德时代突破  ",
      conditionSummary: "price > 200",
      priceSnapshot: 210,
    };

    // When building notification copy, then label is trimmed in title
    const result = buildNotificationCopy(input);
    expect(result.title).toBe("宁德时代突破 · 300750");
  });

  test("falls back to symbol + 告警 when notifyLabel is empty string", () => {
    // Given input with an empty notifyLabel
    const input = {
      symbol: "000858",
      notifyLabel: "",
      conditionSummary: "limit_up == true",
      priceSnapshot: 55.3,
    };

    // When building notification copy, then title uses default format
    const result = buildNotificationCopy(input);
    expect(result.title).toBe("000858 告警");
  });
});
