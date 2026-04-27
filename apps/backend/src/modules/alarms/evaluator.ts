import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../common/db/client.ts";
import { getLogger } from "../../common/logging/logger.ts";
import { alarmTriggerOutbox, alarms } from "../../db/schema.ts";
import type { OutboxPayload } from "../../entities/alarm_trigger_outbox.ts";
import { parseConditionGroupJson, type ConditionGroup } from "./condition-group.ts";
import { evaluateGroup, type MarketSnapshot } from "./evaluate.ts";
import { alarmMetrics } from "./metrics.ts";
import { buildNotificationCopy, summarizeConditionGroup } from "./render.ts";

const logger = getLogger({ module: "alarm_evaluator" });

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function cooldownAllowsTrigger(
  lastTriggeredAt: Date | null,
  occurredAt: Date,
  cooldownSeconds: number,
): boolean {
  if (!lastTriggeredAt) {
    return true;
  }
  return occurredAt.getTime() >= addSeconds(lastTriggeredAt, cooldownSeconds).getTime();
}

export async function evaluateMarketEventForSymbol(input: {
  symbol: string;
  occurredAt: Date;
  snapshot: MarketSnapshot;
  traceId?: string;
}): Promise<void> {
  const t0 = performance.now();
  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(alarms)
      .where(
        and(eq(alarms.symbol, input.symbol), eq(alarms.enabled, true), isNull(alarms.deletedAt)),
      )
      .for("update");

    alarmMetrics.recordAlarmsLoaded(rows.length);

    for (const row of rows) {
      let group: ConditionGroup;
      try {
        group = parseConditionGroupJson(row.conditionGroup);
      } catch {
        logger.warn({ alarmId: row.id }, "skip_invalid_condition_group");
        continue;
      }
      const matchNow = evaluateGroup(group, input.snapshot);
      const prevMatch = row.lastMatchState;
      const edge = !prevMatch && matchNow;
      const cooldownOk = cooldownAllowsTrigger(
        row.lastTriggeredAt,
        input.occurredAt,
        row.cooldownSeconds,
      );
      const shouldTrigger = edge && cooldownOk;

      await tx
        .update(alarms)
        .set({
          lastMatchState: matchNow,
          lastTriggeredAt: shouldTrigger ? input.occurredAt : row.lastTriggeredAt,
          updatedAt: new Date(),
        })
        .where(eq(alarms.id, row.id));

      if (!shouldTrigger) {
        continue;
      }

      const dedupeKey = `outbox:${randomUUID()}`;
      const deliveryId = randomUUID();
      const conditionSummary = summarizeConditionGroup(group);
      const priceSnapshot =
        typeof input.snapshot.price === "number" && Number.isFinite(input.snapshot.price)
          ? input.snapshot.price
          : undefined;

      const { title, body } = buildNotificationCopy({
        symbol: row.symbol,
        notifyLabel: row.notifyLabel,
        conditionSummary,
        priceSnapshot,
      });

      const payload: OutboxPayload = {
        alarmId: row.id,
        userId: row.userId,
        symbol: row.symbol,
        notifyLabel: row.notifyLabel,
        notifyTier: row.notifyTier,
        title,
        body,
        render: {
          symbol: row.symbol,
          headline: row.notifyLabel ?? undefined,
          conditionSummary,
          priceSnapshot,
        },
        occurredAt: input.occurredAt.toISOString(),
        deliveryId,
        traceId: input.traceId,
      };

      await tx.insert(alarmTriggerOutbox).values({
        alarmId: row.id,
        userId: row.userId,
        dedupeKey,
        payload,
        status: "pending",
      });

      alarmMetrics.recordTriggerEnqueued();
    }
  });

  alarmMetrics.recordEvalLatencyMs(performance.now() - t0);
}
