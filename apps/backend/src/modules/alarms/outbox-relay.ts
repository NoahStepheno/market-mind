import { sql } from "drizzle-orm";

import { db } from "../../common/db/client.ts";
import { getLogger } from "../../common/logging/logger.ts";
import type { AsyncBoundedQueue } from "./async-queue.ts";
import type { NotifyTask } from "./notify-queue.ts";

const logger = getLogger({ module: "alarm_outbox_relay" });

type PickedRow = {
  id: string;
  dedupe_key: string;
  payload: unknown;
};

export function createOutboxRelay(notifyQueue: AsyncBoundedQueue<NotifyTask>) {
  let stopped = false;

  async function tick() {
    if (stopped) {
      return;
    }
    try {
      const rows = await db.transaction(async (tx) => {
        const result = await tx.execute(sql`
          WITH cte AS (
            SELECT id
            FROM alarm_trigger_outbox
            WHERE
              status = 'pending'
              OR (
                status = 'processing'
                AND picked_at IS NOT NULL
                AND picked_at < NOW() - INTERVAL '5 minutes'
              )
            ORDER BY created_at ASC
            LIMIT 25
            FOR UPDATE SKIP LOCKED
          )
          UPDATE alarm_trigger_outbox o
          SET status = 'processing', picked_at = NOW()
          FROM cte
          WHERE o.id = cte.id
          RETURNING o.id, o.dedupe_key, o.payload;
        `);
        return result as unknown as PickedRow[];
      });

      for (const row of rows) {
        const payload = row.payload as NotifyTask["payload"];
        const task: NotifyTask = {
          outboxId: row.id,
          dedupeKey: row.dedupe_key,
          payload,
          enqueuedAtMs: Date.now(),
        };
        await notifyQueue.enqueueWhenReady(task);
      }
    } catch (err) {
      logger.error({ err }, "outbox_relay_tick_failed");
    }
  }

  let handle: ReturnType<typeof setInterval> | undefined;

  return {
    start(intervalMs = 250) {
      handle = setInterval(() => {
        void tick();
      }, intervalMs);
    },
    stop() {
      stopped = true;
      if (handle) {
        clearInterval(handle);
        handle = undefined;
      }
    },
  };
}
