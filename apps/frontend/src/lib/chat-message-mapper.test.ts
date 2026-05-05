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
});
