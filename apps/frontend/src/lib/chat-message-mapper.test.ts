import { describe, expect, test } from "vite-plus/test";
import { toThreadMessages } from "./chat-message-mapper";
import type { ChatMessage } from "@/services/chat-api";

describe("chat-message-mapper", () => {
  test("converts ChatMessage with TextBlock to ThreadMessage format", () => {
    const messages: ChatMessage[] = [
      {
        id: "m1",
        sessionId: "s1",
        role: "user",
        status: "done",
        blocks: [{ type: "text", content: "hello" }],
        createdAt: "2026-05-04T00:00:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
    expect(result[0].role).toBe("user");
    expect(result[0].content).toEqual([{ type: "text", text: "hello" }]);
  });

  test("maps assistant role correctly", () => {
    const messages: ChatMessage[] = [
      {
        id: "m2",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [{ type: "text", content: "hi there" }],
        createdAt: "2026-05-04T00:01:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].role).toBe("assistant");
    expect(result[0].content[0]).toEqual({ type: "text", text: "hi there" });
  });

  test("ignores UIBlock", () => {
    const messages: ChatMessage[] = [
      {
        id: "m3",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          { type: "text", content: "alarm" },
          { type: "ui", component: "alarm_preview", props: {} },
        ],
        createdAt: "2026-05-04T00:02:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].content).toHaveLength(1);
    expect(result[0].content[0]).toEqual({ type: "text", text: "alarm" });
  });

  test("handles empty blocks", () => {
    const messages: ChatMessage[] = [
      {
        id: "m4",
        sessionId: "s1",
        role: "user",
        status: "done",
        blocks: [],
        createdAt: "2026-05-04T00:03:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].content).toEqual([]);
  });

  test("ignores tool_call and tool_result blocks", () => {
    const messages: ChatMessage[] = [
      {
        id: "m5",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          { type: "text", content: "checking..." },
          { type: "tool_call", name: "lookup", arguments: {} },
          { type: "tool_result", name: "lookup", result: null },
        ],
        createdAt: "2026-05-04T00:04:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].content).toHaveLength(1);
  });

  test("maps unsupported_response UIBlock with explanation", () => {
    const messages: ChatMessage[] = [
      {
        id: "m6",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          { type: "text", content: "抱歉，不支持MACD指标。" },
          {
            type: "ui",
            component: "unsupported_response",
            props: { explanation: "MACD指标暂不支持，可用指标包括价格、涨跌幅等。" },
          },
        ],
        createdAt: "2026-05-04T00:05:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].content).toHaveLength(2);
    expect(result[0].content[0]).toEqual({ type: "text", text: "抱歉，不支持MACD指标。" });
    expect(result[0].content[1]).toEqual({
      type: "text",
      text: "MACD指标暂不支持，可用指标包括价格、涨跌幅等。",
    });
  });

  test("ignores non-string explanation in UIBlock props", () => {
    const messages: ChatMessage[] = [
      {
        id: "m7",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          { type: "text", content: "text content" },
          {
            type: "ui",
            component: "unsupported_response",
            props: { explanation: { nested: "object" } } as unknown as Record<string, unknown>,
          },
        ],
        createdAt: "2026-05-04T00:06:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].content).toHaveLength(1);
    expect(result[0].content[0]).toEqual({ type: "text", text: "text content" });
  });

  test("ignores empty string explanation in UIBlock props", () => {
    const messages: ChatMessage[] = [
      {
        id: "m8",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          { type: "text", content: "base text" },
          {
            type: "ui",
            component: "unsupported_response",
            props: { explanation: "" },
          },
        ],
        createdAt: "2026-05-04T00:07:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].content).toHaveLength(1);
  });

  test("unsupported_response with only UIBlock (no duplicate text block)", () => {
    const messages: ChatMessage[] = [
      {
        id: "m9",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          {
            type: "ui",
            component: "unsupported_response",
            props: { explanation: "MACD指标暂不支持。" },
          },
        ],
        createdAt: "2026-05-06T00:08:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].content).toHaveLength(1);
    expect(result[0].content[0]).toEqual({ type: "text", text: "MACD指标暂不支持。" });
  });

  test("unsupported_response with non-array metrics/templates does not crash", () => {
    const messages: ChatMessage[] = [
      {
        id: "m11",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          {
            type: "ui",
            component: "unsupported_response",
            props: {
              explanation: "MACD指标暂不支持。",
              metrics: "not-an-array",
              templates: 42,
            },
          },
        ],
        createdAt: "2026-05-07T00:10:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].content).toHaveLength(1);
    const text = (result[0].content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("MACD指标暂不支持");
    expect(text).not.toContain("可用指标");
    expect(text).not.toContain("推荐模板");
  });

  test("unsupported_response with null metrics handles gracefully", () => {
    const messages: ChatMessage[] = [
      {
        id: "m12",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          {
            type: "ui",
            component: "unsupported_response",
            props: {
              explanation: "暂不支持该指标。",
              metrics: null,
              templates: null,
            },
          },
        ],
        createdAt: "2026-05-07T00:11:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].content).toHaveLength(1);
    const text = (result[0].content[0] as { type: "text"; text: string }).text;
    expect(text).toBe("暂不支持该指标。");
  });

  test("unsupported_response UIBlock with metrics and templates includes them in text", () => {
    const messages: ChatMessage[] = [
      {
        id: "m10",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          {
            type: "ui",
            component: "unsupported_response",
            props: {
              explanation: "MACD指标暂不支持。",
              metrics: [
                { value: "price", label: "Price" },
                { value: "volume", label: "Volume" },
              ],
              templates: [
                {
                  id: "price-breakout",
                  title: "Price Breakout",
                  nlText: "当 {symbol} 价格突破 {value} 时提醒我",
                },
              ],
            },
          },
        ],
        createdAt: "2026-05-06T00:09:00Z",
      },
    ];

    const result = toThreadMessages(messages);
    expect(result[0].content).toHaveLength(1);
    const text = (result[0].content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("MACD指标暂不支持");
    expect(text).toContain("可用指标");
    expect(text).toContain("Price");
    expect(text).toContain("推荐模板");
  });
});
