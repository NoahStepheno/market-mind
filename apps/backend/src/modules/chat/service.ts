import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

import { db } from "../../common/db/client.ts";
import { chatMessages, chatSessions } from "../../db/schema.ts";
import { createAlarm } from "../alarms/service.ts";
import { toMessageDto } from "./mapper.ts";
import { chatMetrics } from "./metrics.ts";
import {
  createSession,
  getSessionForUser,
  listMessagesForSession,
  listSessionsForUser,
} from "./repo.ts";
import type { Block } from "./types.ts";

export async function createChatSession(userId: string, title?: string) {
  const row = await createSession({ userId, title });
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getChatSessions(input: { userId: string; limit: number; cursor?: string }) {
  const rows = await listSessionsForUser(input);
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getChatMessages(input: {
  userId: string;
  sessionId: string;
  limit: number;
  cursor?: string;
}) {
  const session = await getSessionForUser(input.userId, input.sessionId);
  if (!session) {
    throw new HTTPException(404, { message: "Session not found" });
  }
  const rows = await listMessagesForSession(input);
  return rows.map(toMessageDto);
}

export async function createUserAndAssistantPlaceholder(input: {
  userId: string;
  sessionId: string;
  content: string;
}) {
  const assistant = await db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, input.sessionId))
      .limit(1)
      .for("update");

    if (!session || session.userId !== input.userId || session.deletedAt) {
      throw new HTTPException(404, { message: "Session not found" });
    }

    await tx.insert(chatMessages).values({
      userId: input.userId,
      sessionId: input.sessionId,
      role: "user",
      status: "done",
      blocks: [{ type: "text", content: input.content }],
    });

    const [assistantMessage] = await tx
      .insert(chatMessages)
      .values({
        userId: input.userId,
        sessionId: input.sessionId,
        role: "assistant",
        status: "streaming",
        blocks: [],
      })
      .returning();

    await tx
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, input.sessionId));
    return assistantMessage;
  });

  chatMetrics.recordMessageCreate();
  return assistant.id;
}

export async function createConfirmAlarmMessage(input: {
  userId: string;
  sessionId: string;
  draft: {
    symbol: string;
    conditionGroup: Record<string, unknown>;
    cooldown?: number;
    enabled?: boolean;
    notifyLabel?: string | null;
    notifyTier?: "standard" | "emphasis";
  };
}) {
  const session = await getSessionForUser(input.userId, input.sessionId);
  if (!session) {
    throw new HTTPException(404, { message: "Session not found" });
  }

  const result = await db.transaction(async (tx) => {
    const [lockedSession] = await tx
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, input.sessionId))
      .limit(1)
      .for("update");

    if (!lockedSession || lockedSession.userId !== input.userId || lockedSession.deletedAt) {
      throw new HTTPException(404, { message: "Session not found" });
    }

    const alarm = await createAlarm({
      userId: input.userId,
      symbol: input.draft.symbol,
      // upstream route validation guarantees this shape
      conditionGroup: input.draft.conditionGroup as never,
      cooldownSeconds: input.draft.cooldown,
      enabled: input.draft.enabled,
      notifyLabel: input.draft.notifyLabel,
      notifyTier: input.draft.notifyTier,
      tx,
    });
    const blocks: Block[] = [
      {
        type: "text",
        content: `Alarm created: ${alarm.id}`,
      },
      {
        type: "ui",
        component: "alarm_preview",
        props: { alarmId: alarm.id, symbol: alarm.symbol },
      },
    ];

    const [createdMessage] = await tx
      .insert(chatMessages)
      .values({
        userId: input.userId,
        sessionId: input.sessionId,
        role: "system",
        blocks,
      })
      .returning();

    await tx
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, input.sessionId));

    return { alarm, message: createdMessage };
  });
  return { alarm: result.alarm, message: toMessageDto(result.message) };
}
