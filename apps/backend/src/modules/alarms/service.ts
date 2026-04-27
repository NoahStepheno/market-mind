import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../../common/db/client.ts";
import { alarmFeedback, alarms } from "../../db/schema.ts";
import {
  assertConditionGroupLimits,
  conditionGroupSchema,
  parseConditionGroupJson,
  type ConditionGroup,
} from "./condition-group.ts";

export function normalizeSymbol(raw: string): string {
  return raw.trim();
}

export async function listAlarmsForUser(userId: string) {
  return db
    .select()
    .from(alarms)
    .where(and(eq(alarms.userId, userId), isNull(alarms.deletedAt)))
    .orderBy(desc(alarms.createdAt));
}

export async function getAlarmForUser(userId: string, alarmId: string) {
  const [row] = await db
    .select()
    .from(alarms)
    .where(and(eq(alarms.userId, userId), eq(alarms.id, alarmId), isNull(alarms.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function createAlarm(input: {
  userId: string;
  symbol: string;
  conditionGroup: ConditionGroup;
  cooldownSeconds?: number;
  enabled?: boolean;
  notifyLabel?: string | null;
  notifyTier?: "standard" | "emphasis";
}) {
  assertConditionGroupLimits(input.conditionGroup);
  const symbol = normalizeSymbol(input.symbol);
  const [row] = await db
    .insert(alarms)
    .values({
      userId: input.userId,
      symbol,
      conditionGroup: input.conditionGroup,
      cooldownSeconds: input.cooldownSeconds ?? 900,
      enabled: input.enabled ?? true,
      notifyLabel: input.notifyLabel ?? null,
      notifyTier: input.notifyTier ?? "standard",
    })
    .returning();
  return row;
}

export async function updateAlarmForUser(
  userId: string,
  alarmId: string,
  patch: Partial<{
    symbol: string;
    conditionGroup: ConditionGroup;
    cooldownSeconds: number;
    enabled: boolean;
    notifyLabel: string | null;
    notifyTier: "standard" | "emphasis";
  }>,
) {
  const existing = await getAlarmForUser(userId, alarmId);
  if (!existing) {
    return null;
  }

  const updates: Partial<typeof alarms.$inferInsert> = { updatedAt: new Date() };
  if (patch.symbol !== undefined) {
    updates.symbol = normalizeSymbol(patch.symbol);
  }
  if (patch.conditionGroup !== undefined) {
    assertConditionGroupLimits(patch.conditionGroup);
    updates.conditionGroup = patch.conditionGroup;
  }
  if (patch.cooldownSeconds !== undefined) {
    updates.cooldownSeconds = patch.cooldownSeconds;
  }
  if (patch.enabled !== undefined) {
    updates.enabled = patch.enabled;
  }
  if (patch.notifyLabel !== undefined) {
    updates.notifyLabel = patch.notifyLabel;
  }
  if (patch.notifyTier !== undefined) {
    updates.notifyTier = patch.notifyTier;
  }

  const [row] = await db
    .update(alarms)
    .set(updates)
    .where(and(eq(alarms.userId, userId), eq(alarms.id, alarmId), isNull(alarms.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteAlarm(userId: string, alarmId: string) {
  const [row] = await db
    .update(alarms)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(alarms.userId, userId), eq(alarms.id, alarmId), isNull(alarms.deletedAt)))
    .returning();
  return row ?? null;
}

export async function addAlarmFeedback(input: {
  userId: string;
  alarmId: string;
  rating: "helpful" | "not_helpful";
}) {
  const alarm = await getAlarmForUser(input.userId, input.alarmId);
  if (!alarm) {
    return null;
  }
  const [row] = await db
    .insert(alarmFeedback)
    .values({
      alarmId: input.alarmId,
      userId: input.userId,
      rating: input.rating,
    })
    .returning();
  return row;
}

export { conditionGroupSchema, parseConditionGroupJson };
