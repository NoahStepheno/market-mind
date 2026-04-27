import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { alarms } from "./alarms.ts";
import { alarmOutboxStatusEnum } from "./enums.ts";
import { users } from "./users.ts";

export const alarmTriggerOutbox = pgTable(
  "alarm_trigger_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alarmId: uuid("alarm_id")
      .references(() => alarms.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    payload: jsonb("payload").notNull(),
    status: alarmOutboxStatusEnum("status").notNull().default("pending"),
    pickedAt: timestamp("picked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("alarm_trigger_outbox_status_created_idx").on(table.status, table.createdAt),
    index("alarm_trigger_outbox_processing_stale_idx").on(table.status, table.pickedAt),
  ],
);

export type OutboxPayload = {
  alarmId: string;
  userId: string;
  symbol: string;
  notifyLabel: string | null;
  notifyTier: "standard" | "emphasis";
  title: string;
  body: string;
  render: {
    symbol: string;
    headline?: string;
    conditionSummary: string;
    priceSnapshot?: number;
  };
  occurredAt: string;
  deliveryId: string;
  traceId?: string;
};
