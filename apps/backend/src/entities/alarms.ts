import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { notifyTierEnum } from "./enums.ts";
import { users } from "./users.ts";

export const alarms = pgTable(
  "alarms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    symbol: varchar("symbol", { length: 64 }).notNull(),
    conditionGroup: jsonb("condition_group").notNull(),
    cooldownSeconds: integer("cooldown_seconds").notNull().default(900),
    enabled: boolean("enabled").notNull().default(true),
    notifyLabel: varchar("notify_label", { length: 64 }),
    notifyTier: notifyTierEnum("notify_tier").notNull().default("standard"),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    lastMatchState: boolean("last_match_state").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("alarms_user_id_idx").on(table.userId),
    index("alarms_symbol_eval_idx").on(table.symbol, table.enabled, table.deletedAt),
  ],
);

export type AlarmRow = typeof alarms.$inferSelect;
export type AlarmInsert = typeof alarms.$inferInsert;
