import { describe, expect, test } from "vite-plus/test";

import { buildChatContext } from "./context-policy.ts";
import type { MessageDto } from "./types.ts";

describe("buildChatContext", () => {
  test("keeps required segments and truncates recent messages by budget", () => {
    const recent: MessageDto[] = [
      {
        id: "m1",
        sessionId: "s1",
        role: "user",
        status: "done",
        blocks: [{ type: "text", content: "hello" }],
        createdAt: new Date().toISOString(),
      },
      {
        id: "m2",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [{ type: "text", content: "world" }],
        createdAt: new Date().toISOString(),
      },
    ];

    const result = buildChatContext({
      systemPrompt: "system",
      userLatest: "latest",
      recentMessages: recent,
      contextBudget: 60,
    });

    expect(result.segments[0]).toContain("system:system");
    expect(result.segments.some((it) => it.includes("user_latest:latest"))).toBe(true);
    expect(result.truncated).toBe(true);
  });

  test("degrades frozen historical alarm_editor blocks into placeholders before truncating", () => {
    const draftCurrent = {
      symbol: "BTCUSDT",
      conditionGroup: { op: ">", value: 100_000 },
    };
    const recent: MessageDto[] = [
      {
        id: "m1",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          {
            type: "ui",
            component: "alarm_editor",
            props: {
              symbol: "ETHUSDT",
              conditionGroup: { op: "<", value: 1000 },
              frozen: true,
            },
          },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: "m2",
        sessionId: "s1",
        role: "assistant",
        status: "done",
        blocks: [
          {
            type: "ui",
            component: "alarm_editor",
            props: draftCurrent,
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ];

    const result = buildChatContext({
      systemPrompt: "system",
      userLatest: "latest",
      draftCurrent,
      recentMessages: recent,
      contextBudget: 280,
    });

    expect(result.truncated).toBe(true);
    expect(result.segments.some((it) => it.includes('"placeholder":true'))).toBe(true);
    expect(result.segments.some((it) => it.includes("draft_current:"))).toBe(true);
  });
});
