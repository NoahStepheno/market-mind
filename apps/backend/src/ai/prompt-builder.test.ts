import { describe, expect, test } from "vite-plus/test";

import { buildPrompt } from "./prompt-builder.ts";

describe("buildPrompt", () => {
  test("produces system message with metric definitions and symbol table", () => {
    const messages = buildPrompt({ userMessage: "茅台跌破1800时提醒我" });

    const system = messages.find((m) => m.role === "system");
    expect(system).toBeDefined();
    expect(system!.content).toContain("支持的指标");
    expect(system!.content).toContain("price");
    expect(system!.content).toContain("pct_change");
    expect(system!.content).toContain("volume");
    expect(system!.content).toContain("常见A股标的代码对照");
    expect(system!.content).toContain("贵州茅台:600519");
  });

  test("includes few-shot examples", () => {
    const messages = buildPrompt({ userMessage: "test" });

    expect(messages.some((m) => m.content.includes("茅台跌破1800"))).toBe(true);
    expect(messages.some((m) => m.content.includes("比亚迪"))).toBe(true);
    expect(messages.some((m) => m.content.includes("情绪指数"))).toBe(true);
    expect(messages.some((m) => m.content.includes("涨跌幅超过3%"))).toBe(true);
    expect(messages.some((m) => m.content.includes("那只新能源"))).toBe(true);
    expect(messages.some((m) => m.content.includes("5分钟涨跌超过2元"))).toBe(true);
  });

  test("appends user message at the end", () => {
    const messages = buildPrompt({ userMessage: "中科曙光涨停打开立刻通知我" });

    const last = messages[messages.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toBe("中科曙光涨停打开立刻通知我");
  });

  test("includes recent messages between examples and current user message", () => {
    const messages = buildPrompt({
      userMessage: "再设一个",
      recentMessages: [
        { role: "user", content: "之前的对话" },
        { role: "assistant", content: "好的已设置" },
      ],
    });

    const userMsgIndex = messages.findIndex((m) => m.role === "user" && m.content === "再设一个");
    const recentUser = messages.findIndex((m) => m.role === "user" && m.content === "之前的对话");
    const recentAssistant = messages.findIndex(
      (m) => m.role === "assistant" && m.content === "好的已设置",
    );

    expect(recentUser).toBeGreaterThan(0);
    expect(recentAssistant).toBeGreaterThan(recentUser);
    expect(userMsgIndex).toBeGreaterThan(recentAssistant);
  });

  test("system prompt contains all 8 metrics", () => {
    const messages = buildPrompt({ userMessage: "test" });
    const system = messages.find((m) => m.role === "system")!;

    const metrics = [
      "price",
      "pct_change",
      "volume",
      "turnover",
      "limit_up",
      "limit_down",
      "volume_ratio_5m",
      "price_change_5m",
    ];
    for (const metric of metrics) {
      expect(system.content).toContain(metric);
    }
  });
});
