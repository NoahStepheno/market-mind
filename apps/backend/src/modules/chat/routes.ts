import { Hono } from "hono";
import { z } from "zod";

import { AuthVariables, requireAuth } from "../auth/middleware.ts";
import { conditionGroupSchema } from "../alarms/condition-group.ts";
import { buildChatContext } from "./context-policy.ts";
import { chatMetrics } from "./metrics.ts";
import { getMessageForSession } from "./repo.ts";
import {
  createChatSession,
  createConfirmAlarmMessage,
  createUserAndAssistantPlaceholder,
  getChatMessages,
  getChatSessions,
} from "./service.ts";
import { streamAssistantMessage } from "./stream.ts";

const CreateSessionBodySchema = z.object({
  title: z.string().max(255).optional(),
});

const ListQuerySchema = z.object({
  cursor: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const CreateMessageBodySchema = z.object({
  content: z.string().min(1).max(8_000),
});

const ConfirmAlarmBodySchema = z.object({
  symbol: z.string().min(1).max(64),
  conditionGroup: conditionGroupSchema,
  cooldown: z
    .number()
    .int()
    .min(0)
    .max(86400 * 365)
    .optional(),
  enabled: z.boolean().optional(),
  notifyLabel: z.string().max(64).nullable().optional(),
  notifyTier: z.enum(["standard", "emphasis"]).optional(),
});

export const chatRoutes = new Hono<AuthVariables>();

chatRoutes.use("*", requireAuth);

chatRoutes.post("/sessions", async (c) => {
  const userId = c.get("authUser").id;
  const body = CreateSessionBodySchema.parse(await c.req.json().catch(() => ({})));
  const session = await createChatSession(userId, body.title);
  return c.json({ session }, 201);
});

chatRoutes.get("/sessions", async (c) => {
  const userId = c.get("authUser").id;
  const query = ListQuerySchema.parse(c.req.query());
  const sessions = await getChatSessions({ userId, limit: query.limit, cursor: query.cursor });
  const nextCursor =
    sessions.length === query.limit ? sessions[sessions.length - 1]?.updatedAt : undefined;
  return c.json({ sessions, nextCursor });
});

chatRoutes.get("/sessions/:id/messages", async (c) => {
  const userId = c.get("authUser").id;
  const sessionId = c.req.param("id");
  const query = ListQuerySchema.parse(c.req.query());
  const messages = await getChatMessages({
    userId,
    sessionId,
    limit: query.limit,
    cursor: query.cursor,
  });
  const nextCursor =
    messages.length === query.limit ? messages[messages.length - 1]?.createdAt : undefined;
  return c.json({ messages, nextCursor });
});

chatRoutes.post("/sessions/:id/messages", async (c) => {
  const userId = c.get("authUser").id;
  const sessionId = c.req.param("id");
  const body = CreateMessageBodySchema.parse(await c.req.json());
  const assistantMessageId = await createUserAndAssistantPlaceholder({
    userId,
    sessionId,
    content: body.content,
  });
  return c.json({
    assistantMessageId,
    streamUrl: `/api/v1/chat/sessions/${sessionId}/stream?messageId=${assistantMessageId}`,
  });
});

chatRoutes.get("/sessions/:id/stream", async (c) => {
  const userId = c.get("authUser").id;
  const sessionId = c.req.param("id");
  const messageId = c.req.query("messageId");
  if (!messageId) {
    return c.json({ code: 400, message: "messageId is required" }, 400);
  }
  const message = await getMessageForSession({ userId, sessionId, messageId });
  if (!message) {
    return c.json({ code: 404, message: "Message not found" }, 404);
  }
  const userPrompt = "继续"; // V1 fallback; can be replaced with full model context input
  const context = buildChatContext({
    systemPrompt: "你是市场助手，优先给出结构化建议。",
    userLatest: userPrompt,
    recentMessages: [],
    contextBudget: 2_000,
  });
  if (context.truncated) {
    chatMetrics.recordContextTruncated();
  }
  return streamAssistantMessage({
    c,
    userId,
    sessionId,
    messageId,
    requestId: c.get("requestId"),
    userPrompt,
  });
});

chatRoutes.post("/sessions/:id/confirm-alarm", async (c) => {
  const userId = c.get("authUser").id;
  const sessionId = c.req.param("id");
  const body = ConfirmAlarmBodySchema.parse(await c.req.json());
  const result = await createConfirmAlarmMessage({
    userId,
    sessionId,
    draft: body,
  });
  return c.json(result, 201);
});
