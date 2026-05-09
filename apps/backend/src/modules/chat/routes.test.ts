import { describe, expect, test, vi, beforeEach } from "vite-plus/test";
import { z } from "zod";

import { Hono } from "hono";

import { appErrorHandler } from "../../common/errors/error-handler.ts";
import type { AuthVariables } from "../auth/middleware.ts";

const mockCreateChatSession = vi.fn();
const mockGetChatSessions = vi.fn();
const mockGetChatMessages = vi.fn();
const mockCreateUserAndAssistantPlaceholder = vi.fn();
const mockCreateConfirmAlarmMessage = vi.fn();
const mockGetMessageForSession = vi.fn();

vi.mock("./service.ts", () => ({
  createChatSession: (...args: unknown[]) =>
    mockCreateChatSession(...(args as [string, string | undefined])),
  getChatSessions: (...args: unknown[]) => mockGetChatSessions(...(args as [object])),
  getChatMessages: (...args: unknown[]) => mockGetChatMessages(...(args as [object])),
  createUserAndAssistantPlaceholder: (...args: unknown[]) =>
    mockCreateUserAndAssistantPlaceholder(...(args as [object])),
  createConfirmAlarmMessage: (...args: unknown[]) =>
    mockCreateConfirmAlarmMessage(...(args as [object])),
}));

vi.mock("./repo.ts", () => ({
  getMessageForSession: (...args: unknown[]) => mockGetMessageForSession(...(args as [object])),
}));

vi.mock("./context-policy.ts", () => ({
  buildChatContext: () => ({ truncated: false }),
}));

vi.mock("./stream.ts", () => ({
  streamAssistantMessage: vi.fn(),
}));

vi.mock("./metrics.ts", () => ({
  chatMetrics: { recordContextTruncated: vi.fn() },
}));

vi.mock("../auth/middleware.ts", () => ({
  requireAuth: async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock("../alarms/condition-group.ts", () => ({
  conditionGroupSchema: z.any(),
}));

import { chatRoutes } from "./routes.ts";

function createTestApp() {
  const app = new Hono<AuthVariables>();
  app.onError(appErrorHandler);
  app.use("*", async (c, next) => {
    c.set("authUser", { id: "user-1", email: "test@test.com", name: "Test", avatarUrl: null });
    c.set("requestId", "req-1");
    c.set("traceId", "trace-1");
    await next();
  });
  app.route("/api/v1/chat", chatRoutes);
  return app;
}

const fakeSession = {
  id: "sess-1",
  userId: "user-1",
  title: "Test session",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const fakeMessage = {
  id: "msg-1",
  sessionId: "sess-1",
  userId: "user-1",
  role: "user",
  status: "done",
  blocks: [{ type: "text", content: "hello" }],
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /chat/sessions", () => {
  test("creates a new chat session", async () => {
    mockCreateChatSession.mockResolvedValueOnce(fakeSession);
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test session" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session.id).toBe("sess-1");
  });

  test("creates session without title", async () => {
    mockCreateChatSession.mockResolvedValueOnce(fakeSession);
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(201);
  });
});

describe("GET /chat/sessions", () => {
  test("returns list of sessions", async () => {
    mockGetChatSessions.mockResolvedValueOnce([fakeSession]);
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toHaveLength(1);
  });

  test("returns nextCursor when sessions fill limit", async () => {
    const sessions = Array.from({ length: 20 }, (_, i) => ({
      ...fakeSession,
      id: `sess-${i}`,
      updatedAt: new Date(Date.now() + i).toISOString(),
    }));
    mockGetChatSessions.mockResolvedValueOnce(sessions);
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions?limit=20");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nextCursor).toBeDefined();
  });
});

describe("GET /chat/sessions/:id/messages", () => {
  test("returns messages for a session", async () => {
    mockGetChatMessages.mockResolvedValueOnce([fakeMessage]);
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions/sess-1/messages?limit=20");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
  });
});

describe("POST /chat/sessions/:id/messages", () => {
  test("creates user message and returns assistant placeholder", async () => {
    mockCreateUserAndAssistantPlaceholder.mockResolvedValueOnce("msg-assistant-1");
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions/sess-1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "茅台跌破1800时提醒我" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assistantMessageId).toBe("msg-assistant-1");
    expect(body.streamUrl).toContain("/api/v1/chat/sessions/sess-1/stream");
  });

  test("returns 400 for empty content", async () => {
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions/sess-1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /chat/sessions/:id/confirm-alarm", () => {
  const validBody = {
    symbol: "600519",
    conditionGroup: {
      op: "AND",
      conditions: [{ metric: "price", operator: "<", value: 1800 }],
    },
  };

  test("creates confirm alarm message", async () => {
    mockCreateConfirmAlarmMessage.mockResolvedValueOnce({
      alarm: { id: "alarm-1" },
      message: { id: "msg-1" },
    });
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions/sess-1/confirm-alarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(201);
  });

  test("returns 400 for missing symbol", async () => {
    const app = createTestApp();

    const res = await app.request("/api/v1/chat/sessions/sess-1/confirm-alarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conditionGroup: validBody.conditionGroup,
      }),
    });

    expect(res.status).toBe(400);
  });

  // Covers: 2.5-INT-001 @P1
  // Given a valid session and a confirm-alarm body
  // When user POSTs /sessions/:id/confirm-alarm
  // Then an alarm is created and the result includes both alarm and message
  test("2.5-INT-001 @P1: creates alarm and returns result with alarm + message", async () => {
    const fakeAlarm = { id: "alarm-confirm-1", symbol: "600519" };
    const fakeMsg = { id: "msg-confirm-1", role: "system", blocks: [] };
    mockCreateConfirmAlarmMessage.mockResolvedValueOnce({
      alarm: fakeAlarm,
      message: fakeMsg,
    });
    const app = createTestApp();

    // Given - session exists, valid alarm draft body
    // When - user confirms the alarm
    const res = await app.request("/api/v1/chat/sessions/sess-1/confirm-alarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    // Then - alarm is created and returned
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.alarm).toBeDefined();
    expect(body.alarm.id).toBe("alarm-confirm-1");
    expect(body.alarm.symbol).toBe("600519");
    expect(body.message).toBeDefined();
    expect(body.message.id).toBe("msg-confirm-1");
    expect(mockCreateConfirmAlarmMessage).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: "sess-1",
      draft: validBody,
    });
  });
});

// Covers: 2.5-INT-002 @P1
// Given a user sends a message requesting an alarm but never calls confirm-alarm
// When the conversation ends without confirmation
// Then no alarm is created because createConfirmAlarmMessage was never invoked
describe("Unconfirmed draft @P1", () => {
  test("2.5-INT-002 @P1: unconfirmed draft never creates alarm in DB", async () => {
    mockCreateUserAndAssistantPlaceholder.mockResolvedValueOnce("msg-assistant-draft");
    const app = createTestApp();

    // Given - user sends a message about creating an alarm
    // When - user does NOT call confirm-alarm
    const res = await app.request("/api/v1/chat/sessions/sess-1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "茅台跌破1800时提醒我" }),
    });

    // Then - message is created but confirm-alarm is never called
    expect(res.status).toBe(200);
    expect(mockCreateConfirmAlarmMessage).not.toHaveBeenCalled();
  });
});
