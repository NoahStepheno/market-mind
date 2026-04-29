import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.ts";

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title"),
    memorySummary: text("memory_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("chat_sessions_user_updated_idx").on(table.userId, table.updatedAt),
    index("chat_sessions_user_id_idx").on(table.userId, table.id),
  ],
);

export type ChatSessionRow = typeof chatSessions.$inferSelect;
export type ChatSessionInsert = typeof chatSessions.$inferInsert;

/*
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  memory_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_updated_idx
  ON chat_sessions(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx
  ON chat_sessions(user_id, id);
*/
