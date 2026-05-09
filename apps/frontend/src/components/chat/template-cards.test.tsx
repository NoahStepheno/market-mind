import { describe, expect, test, vi } from "vite-plus/test";
import { renderToString } from "react-dom/server";
import * as React from "react";
import { TemplateCards } from "./template-cards";

describe("TemplateCards", () => {
  test("renders 3 cards from PRESET_TEMPLATES", () => {
    const html = renderToString(<TemplateCards onTemplateClick={vi.fn()} />);
    expect(html).toContain("价格突破");
    expect(html).toContain("放量提醒");
    expect(html).toContain("大涨大跌");
  });

  test("passes onClick to each card", () => {
    const html = renderToString(<TemplateCards onTemplateClick={vi.fn()} />);
    expect(html).toContain("cursor-pointer");
    const buttonCount = html.split("cursor-pointer").length - 1;
    expect(buttonCount).toBe(3);
  });

  test("responsive classes present", () => {
    const html = renderToString(<TemplateCards onTemplateClick={vi.fn()} />);
    expect(html).toContain("flex-col");
    expect(html).toContain("md:flex-row");
  });
});
