import { test, expect } from "@playwright/test";

test.describe("Chat AI Streaming API (ATDD) — 2.3-API", () => {
  // All tests skipped: require authenticated session + running backend with GLM-5 config

  // Given: an authenticated user with an active chat session
  // When: POST /chat/sessions/:id/messages with a valid NL alarm request
  // Then: response returns 200 with assistantMessageId and streamUrl
  test.skip("[P0] should create assistant placeholder and return stream URL for NL message", async ({
    request,
  }) => {
    // Given: authenticated session with a chat session
    const sessionId = "test-session-id";
    const userMessage = "当贵州茅台股价超过1800元时提醒我";

    // When: submit NL message
    const response = await request.post(`/chat/sessions/${sessionId}/messages`, {
      data: { content: userMessage },
    });

    // Then: returns assistant message placeholder with stream URL
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.assistantMessageId).toBeTruthy();
    expect(body.streamUrl).toContain(`/chat/sessions/${sessionId}/stream`);
  });

  // Given: an assistant message in streaming status
  // When: GET /chat/sessions/:id/stream with X-Message-Id header
  // Then: SSE events follow protocol: message_start → block_start → block_delta → block_end → message_end
  test.skip("[P0] should emit SSE events in correct protocol sequence", async ({ request }) => {
    const sessionId = "test-session-id";
    const messageId = "test-message-id";

    const response = await request.get(`/chat/sessions/${sessionId}/stream`, {
      headers: { "X-Message-Id": messageId },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/event-stream");

    const text = await response.text();
    const events = text
      .split("\n\n")
      .filter((block) => block.startsWith("event:"))
      .map((block) => {
        const eventMatch = block.match(/^event:\s*(\w+)/);
        return eventMatch?.[1];
      })
      .filter(Boolean);

    // Protocol order: message_start → block_start → block_delta → block_end → message_end
    expect(events[0]).toBe("message_start");
    expect(events).toContain("block_start");
    expect(events).toContain("block_delta");
    expect(events).toContain("block_end");
    expect(events[events.length - 1]).toBe("message_end");
  });

  // Given: a valid NL alarm request for a supported metric
  // When: SSE stream processes the AI response
  // Then: stream includes block_patch with draft alarm data
  test.skip("[P1] should include alarm draft in SSE stream for supported metric", async ({
    request,
  }) => {
    const sessionId = "test-session-id";
    const messageId = "test-message-id";

    const response = await request.get(`/chat/sessions/${sessionId}/stream`, {
      headers: { "X-Message-Id": messageId },
    });

    const text = await response.text();
    // Should contain block_patch event with draft data
    expect(text).toContain("block_patch");

    // block_patch should have draft alarm structure
    const patchLines = text.split("\n").filter((line) => line.startsWith("data:"));
    const patchData = patchLines.find((line) => line.includes("draft"));
    expect(patchData).toBeTruthy();
  });

  // Given: an unsupported metric request (e.g., MACD golden cross)
  // When: AI parser processes the message
  // Then: SSE stream contains text explanation without draft
  test.skip("[P1] should return text-only response for unsupported metric", async ({ request }) => {
    const sessionId = "test-session-id";

    // First submit unsupported metric message
    await request.post(`/chat/sessions/${sessionId}/messages`, {
      data: { content: "MACD金叉时提醒我" },
    });

    const messageId = "unsupported-test-message-id";
    const response = await request.get(`/chat/sessions/${sessionId}/stream`, {
      headers: { "X-Message-Id": messageId },
    });

    const text = await response.text();

    // Should contain text block with explanation
    expect(text).toContain("block_delta");

    // Should NOT contain alarm draft for unsupported metric
    const hasDraft = text.includes('"draft"') && text.includes("conditionGroup");
    expect(hasDraft).toBe(false);
  });

  // Given: a missing X-Message-Id header
  // When: GET /chat/sessions/:id/stream
  // Then: returns 400 error with MISSING_MESSAGE_ID code
  test.skip("[P2] should return 400 when X-Message-Id header is missing", async ({ request }) => {
    const sessionId = "test-session-id";

    const response = await request.get(`/chat/sessions/${sessionId}/stream`);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("MISSING_MESSAGE_ID");
  });
});
