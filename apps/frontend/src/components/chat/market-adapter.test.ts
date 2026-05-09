import { describe, expect, test, vi } from "vite-plus/test";

import type { ChatModelRunOptions } from "@assistant-ui/react";

// eslint-disable-next-line typescript-eslint/no-explicit-any
async function collectAdapter(gen: any) {
  const results: unknown[] = [];
  for await (const chunk of gen) {
    results.push(chunk);
  }
  return results;
}

const mockSendMessage = vi.fn();
const mockStreamSse = vi.fn();

vi.mock("@/services/chat-api", () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...(args as [])),
  streamSse: (...args: unknown[]) => mockStreamSse(...(args as [])),
}));

vi.mock("@/store/chat", () => ({
  useChat: {
    getState: () => ({ currentSessionId: "session-1", addLocalMessage: vi.fn() }),
  },
}));

vi.mock("@/store/auth", () => ({
  useAuth: {
    getState: () => ({ accessToken: "test-token" }),
  },
}));

import { marketChatAdapter } from "./market-adapter.ts";

describe("marketChatAdapter", () => {
  const baseOptions = {
    messages: [
      { role: "user" as const, content: [{ type: "text" as const, text: "茅台跌破1800" }] },
    ],
    abortSignal: new AbortController().signal,
  } as unknown as ChatModelRunOptions;

  test("handles TextBlock streaming with block_delta events", async () => {
    mockSendMessage.mockResolvedValueOnce({ assistantMessageId: "msg-1" });
    async function* mockStream() {
      yield { event: "block_delta", payload: { data: { delta: "好的，" } } };
      yield { event: "block_delta", payload: { data: { delta: "已设置告警。" } } };
      yield { event: "message_end", payload: { data: {} } };
    }
    mockStreamSse.mockReturnValueOnce(mockStream());

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    expect(results).toHaveLength(2);
    expect((results[0] as any).content[0].text).toBe("好的，");
    expect((results[1] as any).content[0].text).toBe("好的，已设置告警。");
  });

  test("handles UIBlock block_patch event with draft summary", async () => {
    mockSendMessage.mockResolvedValueOnce({ assistantMessageId: "msg-2" });
    async function* mockStream() {
      yield { event: "block_delta", payload: { data: { delta: "已设置。" } } };
      yield {
        event: "block_patch",
        payload: {
          data: {
            draft: {
              symbol: "600519",
              symbolName: "贵州茅台",
              conditionGroup: {
                operator: "AND",
                conditions: [{ metric: "price", operator: "<=", value: 1800 }],
              },
            },
          },
        },
      };
      yield { event: "message_end", payload: { data: {} } };
    }
    mockStreamSse.mockReturnValueOnce(mockStream());

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    expect(results).toHaveLength(2);
    const lastContent = (results[1] as any).content[0].text;
    expect(lastContent).toContain("告警草稿");
    expect(lastContent).toContain("贵州茅台");
  });

  test("handles error event with connection lost message", async () => {
    mockSendMessage.mockResolvedValueOnce({ assistantMessageId: "msg-3" });
    async function* mockStream() {
      yield { event: "block_delta", payload: { data: { delta: "思考中..." } } };
      yield {
        event: "error",
        payload: { data: { code: "CHAT_AI_TIMEOUT", message: "AI 服务响应超时" } },
      };
    }
    mockStreamSse.mockReturnValueOnce(mockStream());

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    expect(results).toHaveLength(2);
    const lastContent = (results[1] as any).content[0].text;
    expect(lastContent).toContain("⚠️");
    expect(lastContent).toContain("AI 服务响应超时");
  });

  test("returns error when no session exists", async () => {
    const { useChat } = await import("@/store/chat");
    vi.spyOn(useChat, "getState").mockReturnValueOnce({ currentSessionId: null } as any);

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    expect(results).toHaveLength(1);
    expect((results[0] as any).content[0].text).toContain("请先创建");
  });

  test("returns error when message content is empty", async () => {
    const emptyOptions = {
      messages: [{ role: "user" as const, content: [{ type: "text" as const, text: "  " }] }],
      abortSignal: new AbortController().signal,
    } as unknown as ChatModelRunOptions;

    const gen = marketChatAdapter.run(emptyOptions);
    const results = await collectAdapter(gen);

    expect(results).toHaveLength(1);
    expect((results[0] as any).content[0].text).toContain("不能为空");
  });

  test("handles streamSse throwing by yielding fallback message", async () => {
    mockSendMessage.mockResolvedValueOnce({ assistantMessageId: "msg-4" });
    async function* mockStream() {
      yield { event: "block_delta", payload: { data: { delta: "部分" } } };
      throw new Error("fetch failed");
    }
    mockStreamSse.mockReturnValueOnce(mockStream());

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    expect(results.length).toBeGreaterThanOrEqual(1);
    const lastContent = (results[results.length - 1] as any).content[0].text;
    expect(lastContent).toContain("部分");
    expect(lastContent).toContain("响应中断");
  });

  test("preserves accumulated text across error and subsequent events", async () => {
    mockSendMessage.mockResolvedValueOnce({ assistantMessageId: "msg-5" });
    async function* mockStream() {
      yield { event: "block_delta", payload: { data: { delta: "正在分析" } } };
      yield { event: "error", payload: { data: { message: "超时" } } };
      yield { event: "message_end", payload: { data: {} } };
    }
    mockStreamSse.mockReturnValueOnce(mockStream());

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    const lastContent = (results[results.length - 1] as any).content[0].text;
    expect(lastContent).toContain("正在分析");
    expect(lastContent).toContain("超时");
  });

  test("AbortError from stream yields nothing (user navigated away)", async () => {
    mockSendMessage.mockResolvedValueOnce({ assistantMessageId: "msg-6" });
    async function* mockStream() {
      yield { event: "block_delta", payload: { data: { delta: "思考中" } } };
      throw new DOMException("The user aborted a request.", "AbortError");
    }
    mockStreamSse.mockReturnValueOnce(mockStream());

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    expect(results).toHaveLength(1);
    expect((results[0] as any).content[0].text).toBe("思考中");
  });

  test("block_patch with explanation (unsupported_response) is rendered during streaming", async () => {
    mockSendMessage.mockResolvedValueOnce({ assistantMessageId: "msg-7" });
    async function* mockStream() {
      yield {
        event: "block_patch",
        payload: {
          data: {
            blockId: "b2",
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
      };
      yield { event: "message_end", payload: { data: {} } };
    }
    mockStreamSse.mockReturnValueOnce(mockStream());

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    const lastContent = (results[results.length - 1] as any).content[0].text;
    expect(lastContent).toContain("MACD指标暂不支持");
    expect(lastContent).toContain("可用指标");
    expect(lastContent).toContain("Price");
    expect(lastContent).toContain("推荐模板");
    expect(lastContent).toContain("价格突破");
    expect(lastContent).not.toMatch(/^\n/);
  });

  test("block_patch with empty explanation is ignored", async () => {
    mockSendMessage.mockResolvedValueOnce({ assistantMessageId: "msg-8" });
    async function* mockStream() {
      yield { event: "block_delta", payload: { data: { delta: "done" } } };
      yield { event: "block_patch", payload: { data: { blockId: "b2", explanation: "" } } };
      yield { event: "message_end", payload: { data: {} } };
    }
    mockStreamSse.mockReturnValueOnce(mockStream());

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    expect(results).toHaveLength(1);
    expect((results[0] as any).content[0].text).toBe("done");
  });

  test("AbortError during sendMessage yields nothing", async () => {
    mockSendMessage.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    expect(results).toHaveLength(0);
  });

  test("block_patch with non-array metrics/templates does not crash", async () => {
    mockSendMessage.mockResolvedValueOnce({ assistantMessageId: "msg-9" });
    async function* mockStream() {
      yield {
        event: "block_patch",
        payload: {
          data: {
            blockId: "b2",
            explanation: "指标不支持。",
            metrics: "not-an-array",
            templates: null,
          },
        },
      };
      yield { event: "message_end", payload: { data: {} } };
    }
    mockStreamSse.mockReturnValueOnce(mockStream());

    const gen = marketChatAdapter.run(baseOptions);
    const results = await collectAdapter(gen);

    const lastContent = (results[results.length - 1] as any).content[0].text;
    expect(lastContent).toContain("指标不支持");
    expect(lastContent).not.toContain("可用指标");
    expect(lastContent).not.toContain("推荐模板");
  });
});
