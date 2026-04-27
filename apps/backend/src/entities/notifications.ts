import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { notificationStatusEnum, notifyTierEnum } from "./enums.ts";
import { users } from "./users.ts";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    sourceType: varchar("source_type", { length: 64 }).notNull(),
    sourceId: text("source_id"),
    dedupeKey: text("dedupe_key").notNull().unique(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    notifyTier: notifyTierEnum("notify_tier").notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_source_idx").on(table.sourceType, table.sourceId),
  ],
);
