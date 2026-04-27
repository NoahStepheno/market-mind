import { eq } from "drizzle-orm";

import { db } from "../../common/db/client.ts";
import { alarmTriggerOutbox, notifications } from "../../db/schema.ts";
import { getLogger } from "../../common/logging/logger.ts";
import type { AsyncBoundedQueue } from "./async-queue.ts";
import { alarmMetrics } from "./metrics.ts";
import type { NotifyTask } from "./notify-queue.ts";

const logger = getLogger({ module: "alarm_notify_worker" });

async function deliverPushStub(task: NotifyTask) {
  logger.info(
    {
      deliveryId: task.payload.deliveryId,
      alarmId: task.payload.alarmId,
      userId: task.payload.userId,
      symbol: task.payload.symbol,
      notifyTier: task.payload.notifyTier,
    },
    "push_stub_deliver",
  );
}

export function createNotifyWorker(notifyQueue: AsyncBoundedQueue<NotifyTask>) {
  let stopped = false;

  async function processOne(task: NotifyTask) {
    const lag = Date.now() - task.enqueuedAtMs;
    alarmMetrics.recordNotifyLagMs(lag);

    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(notifications)
        .values({
          userId: task.payload.userId,
          sourceType: "alarm",
          sourceId: task.payload.alarmId,
          dedupeKey: task.dedupeKey,
          title: task.payload.title,
          body: task.payload.body,
          notifyTier: task.payload.notifyTier,
          status: "pending",
        })
        .onConflictDoNothing({ target: notifications.dedupeKey })
        .returning({ id: notifications.id });

      if (inserted.length === 0) {
        alarmMetrics.recordDedupeConflict();
      }

      await tx
        .update(alarmTriggerOutbox)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(alarmTriggerOutbox.id, task.outboxId));
    });

    await deliverPushStub(task);
  }

  async function loop() {
    while (!stopped) {
      const task = await notifyQueue.dequeue();
      try {
        await processOne(task);
      } catch (err) {
        logger.error(
          { err, deliveryId: task.payload.deliveryId, outboxId: task.outboxId },
          "notify_worker_task_failed",
        );
      }
    }
  }

  return {
    start() {
      void loop();
    },
    stop() {
      stopped = true;
    },
  };
}
