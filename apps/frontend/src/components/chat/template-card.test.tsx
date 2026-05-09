import { describe, expect, test, vi } from "vite-plus/test";
import { renderToString } from "react-dom/server";
import * as React from "react";
import { TemplateCard } from "./template-card";

describe("TemplateCard", () => {
  test("renders icon, title, and description", () => {
    const html = renderToString(
      <TemplateCard
        icon="📈"
        title="价格突破"
        description="价格突破目标时提醒"
        nlText="当 AAPL 价格突破 180 时提醒我"
        onClick={vi.fn()}
      />,
    );
    expect(html).toContain("📈");
    expect(html).toContain("价格突破");
    expect(html).toContain("价格突破目标时提醒");
  });

  test("has cursor-pointer and button role for clickability", () => {
    const html = renderToString(
      <TemplateCard
        icon="📊"
        title="放量提醒"
        description="成交量异常放大时提醒"
        nlText="当 AAPL 成交量超过 1000000 时提醒我"
        onClick={vi.fn()}
      />,
    );
    expect(html).toContain("cursor-pointer");
    expect(html).toContain("button");
  });

  test("hover and press scale classes present", () => {
    const html = renderToString(
      <TemplateCard
        icon="⚡"
        title="大涨大跌"
        description="涨跌幅超过阈值时提醒"
        nlText="当 AAPL 涨跌幅超过 5% 时提醒我"
        onClick={vi.fn()}
      />,
    );
    expect(html).toContain("hover:scale-[0.98]");
    expect(html).toContain("active:scale-[0.95]");
  });

  test("aria-label set correctly", () => {
    const html = renderToString(
      <TemplateCard
        icon="📈"
        title="价格突破"
        description="价格突破目标时提醒"
        nlText="text"
        onClick={vi.fn()}
      />,
    );
    expect(html).toContain("使用模板: 价格突破");
  });
});
