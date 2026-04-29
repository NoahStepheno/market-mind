import { and, asc, desc, eq, gt, isNull, lt } from "drizzle-orm";

import { db } from "../../common/db/client.ts";
import { chatMessages, chatSessions } from "../../db/schema.ts";
import type { Block } from "./types.ts";

export async function createSession(input: { userId: string; title?: string }) {
  const [row] = await db
    .insert(chatSessions)
    .values({
      userId: input.userId,
      title: input.title ?? null,
    })
    .returning();
  return row;
}

export async function getSessionForUser(userId: string, sessionId: string) {
  const [row] = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.userId, userId),
        eq(chatSessions.id, sessionId),
        isNull(chatSessions.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listSessionsForUser(input: {
  userId: string;
  limit: number;
  cursor?: string;
}) {
  const baseWhere = and(eq(chatSessions.userId, input.userId), isNull(chatSessions.deletedAt));
  const rows = input.cursor
    ? await db
        .select()
        .from(chatSessions)
        .where(and(baseWhere, lt(chatSessions.updatedAt, new Date(input.cursor))))
        .orderBy(desc(chatSessions.updatedAt))
        .limit(input.limit)
    : await db
        .select()
        .from(chatSessions)
        .where(baseWhere)
        .orderBy(desc(chatSessions.updatedAt))
        .limit(input.limit);
  return rows;
}

export async function listMessagesForSession(input: {
  userId: string;
  sessionId: string;
  limit: number;
  cursor?: string;
}) {
  const baseWhere = and(
    eq(chatMessages.userId, input.userId),
    eq(chatMessages.sessionId, input.sessionId),
  );
  const rows = input.cursor
    ? await db
        .select()
        .from(chatMessages)
        .where(and(baseWhere, gt(chatMessages.createdAt, new Date(input.cursor))))
        .orderBy(asc(chatMessages.createdAt))
        .limit(input.limit)
    : await db
        .select()
        .from(chatMessages)
        .where(baseWhere)
        .orderBy(asc(chatMessages.createdAt))
        .limit(input.limit);
  return rows;
}

export async function createMessage(input: {
  userId: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  status?: "streaming" | "done";
  blocks: Block[];
}) {
  const [row] = await db
    .insert(chatMessages)
    .values({
      userId: input.userId,
      sessionId: input.sessionId,
      role: input.role,
      status: input.status ?? "done",
      blocks: input.blocks,
    })
    .returning();
  return row;
}

export async function getMessageForSession(input: {
  userId: string;
  sessionId: string;
  messageId: string;
}) {
  const [row] = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, input.userId),
        eq(chatMessages.sessionId, input.sessionId),
        eq(chatMessages.id, input.messageId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function updateAssistantMessageDone(input: {
  userId: string;
  sessionId: string;
  messageId: string;
  blocks: Block[];
}) {
  const [row] = await db
    .update(chatMessages)
    .set({ status: "done", blocks: input.blocks })
    .where(
      and(
        eq(chatMessages.userId, input.userId),
        eq(chatMessages.sessionId, input.sessionId),
        eq(chatMessages.id, input.messageId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function touchSession(sessionId: string) {
  await db
    .update(chatSessions)
    .set({ updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId));
}
