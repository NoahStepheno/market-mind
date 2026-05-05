import { describe, expect, test, vi } from "vite-plus/test";

import { Hono } from "hono";

import { appErrorHandler } from "../../common/errors/error-handler.ts";

const mockGetMessageForSession = vi.fn();
const mockStreamAssistantMessage = vi.fn();
const mockBuildChatContext = vi.fn();
const mockCreateUserAndAssistantPlaceholder = vi.fn();

vi.mock("./repo.ts", () => ({
  getMessageForSession: (...args: unknown[]) => mockGetMessageForSession(...(args as [])),
  updateAssistantMessageDone: vi.fn(() => Promise.resolve({ id: "msg-1" })),
}));

vi.mock("./stream.ts", () => ({
  streamAssistantMessage: (...args: unknown[]) => mockStreamAssistantMessage(...(args as [])),
}));

vi.mock("./context-policy.ts", () => ({
  buildChatContext: (...args: unknown[]) => mockBuildChatContext(...(args as [])),
}));

vi.mock("./service.ts", () => ({
  getChatMessages: vi.fn(),
  getChatSessions: vi.fn(),
  createChatSession: vi.fn(),
  createUserAndAssistantPlaceholder: (...args: unknown[]) =>
    mockCreateUserAndAssistantPlaceholder(...(args as [])),
  createConfirmAlarmMessage: vi.fn(),
}));

vi.mock("./metrics.ts", () => ({
  chatMetrics: {
    recordStreamStart: vi.fn(),
    recordStreamError: vi.fn(),
    recordStreamDuration: vi.fn(),
    recordAssistantBlocksSize: vi.fn(),
    recordContextTruncated: vi.fn(),
    recordMessageCreate: vi.fn(),
  },
}));

vi.mock("../auth/middleware.ts", () => ({
  requireAuth: async (c: any, next: any) => {
    c.set("authUser", { id: "user-1" });
    c.set("requestId", "req-1");
    await next();
  },
  AuthVariables: {} as any,
}));

vi.mock("../alarms/condition-group.ts", () => ({
  conditionGroupSchema: {} as any,
}));

import { chatRoutes } from "./routes.ts";

function createTestApp() {
  const app = new Hono();
  app.onError(appErrorHandler);
  app.route("/api/v1/chat", chatRoutes);
  return app;
}

describe("GET /sessions/:id/stream", () => {
  test("returns 400 when messageId is missing", async () => {
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions/s-1/stream", {
      headers: { Authorization: "Bearer token" },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("CHAT_INVALID_CURSOR");
  });

  test("returns 404 when message does not belong to user+session triple", async () => {
    mockGetMessageForSession.mockResolvedValueOnce(null);
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions/s-1/stream", {
      headers: { Authorization: "Bearer token", "X-Message-Id": "other-user-msg" },
    });

    expect(res.status).toBe(404);
    expect(mockGetMessageForSession).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: "s-1",
      messageId: "other-user-msg",
    });
  });

  test("delegates to streamAssistantMessage for valid message", async () => {
    mockGetMessageForSession.mockResolvedValueOnce({
      id: "msg-1",
      status: "streaming",
    });
    mockBuildChatContext.mockReturnValue({ segments: [], truncated: false });
    mockStreamAssistantMessage.mockResolvedValueOnce(new Response("ok"));

    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions/s-1/stream", {
      headers: { Authorization: "Bearer token", "X-Message-Id": "msg-1" },
    });

    expect(res.ok).toBe(true);
    expect(mockGetMessageForSession).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: "s-1",
      messageId: "msg-1",
    });
    expect(mockStreamAssistantMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        sessionId: "s-1",
        messageId: "msg-1",
      }),
    );
  });
});

describe("POST /sessions/:id/messages", () => {
  test("creates user+assistant messages and returns stream URL", async () => {
    mockCreateUserAndAssistantPlaceholder.mockResolvedValueOnce("assistant-msg-1");
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions/s-1/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "茅台跌破1800时提醒我" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assistantMessageId).toBe("assistant-msg-1");
    expect(body.streamUrl).toBe("/api/v1/chat/sessions/s-1/stream");
  });
});
