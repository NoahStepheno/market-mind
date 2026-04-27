import type { OutboxPayload } from "../../entities/alarm_trigger_outbox.ts";

export type NotifyTask = {
  outboxId: string;
  dedupeKey: string;
  payload: OutboxPayload;
  enqueuedAtMs: number;
};
