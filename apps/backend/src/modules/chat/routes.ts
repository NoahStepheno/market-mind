import { Hono } from "hono";
import { z } from "zod";

import { AppError } from "../../common/errors/app-error.ts";
import { AuthVariables, requireAuth } from "../auth/middleware.ts";
import { conditionGroupSchema } from "../alarms/condition-group.ts";
import { chatErrorCodes } from "./errors.ts";
import { listMessagesForSession, getMessageForSession } from "./repo.ts";
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
  const body = CreateMessageBodySchema.parse(
    await c.req.json().catch(() => {
      throw new AppError("Invalid JSON body", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }),
  );
  const assistantMessageId = await createUserAndAssistantPlaceholder({
    userId,
    sessionId,
    content: body.content,
  });
  return c.json({
    assistantMessageId,
    streamUrl: `/api/v1/chat/sessions/${sessionId}/stream`,
  });
});

chatRoutes.get("/sessions/:id/stream", async (c) => {
  const userId = c.get("authUser").id;
  const sessionId = c.req.param("id");
  const messageId = c.req.header("X-Message-Id");
  if (!messageId) {
    throw new AppError("messageId 是必填项", {
      code: chatErrorCodes.MISSING_MESSAGE_ID,
      statusCode: 400,
    });
  }
  const message = await getMessageForSession({ userId, sessionId, messageId });
  if (!message) {
    throw new AppError("消息不存在", {
      code: chatErrorCodes.MESSAGE_NOT_FOUND,
      statusCode: 404,
    });
  }
  // Fetch actual user message from DB for the assistant placeholder
  const recentRows = await listMessagesForSession({ userId, sessionId, limit: 10 });
  const lastUserRow = [...recentRows].reverse().find((r) => r.role === "user");
  const actualUserPrompt = (() => {
    if (!lastUserRow) return "继续";
    const blocks = lastUserRow.blocks as { type: string; content?: string }[];
    const textBlock = blocks.find((b) => b.type === "text" && b.content);
    return textBlock?.content ?? "继续";
  })();

  const recentMessages = recentRows
    .filter((r) => r.id !== messageId)
    .map((r) => {
      const blocks = r.blocks as { type: string; content?: string }[];
      const text = blocks
        .filter((b) => b.type === "text" && b.content)
        .map((b) => b.content!)
        .join("");
      return { role: r.role as "user" | "assistant", content: text };
    })
    .filter((m) => m.content);

  return streamAssistantMessage({
    c,
    userId,
    sessionId,
    messageId,
    requestId: c.get("requestId"),
    userPrompt: actualUserPrompt,
    recentMessages,
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
