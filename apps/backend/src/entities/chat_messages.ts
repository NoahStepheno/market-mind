import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { chatMessageRoleEnum, chatMessageStatusEnum } from "./enums.ts";
import { chatSessions } from "./chat_sessions.ts";
import { users } from "./users.ts";

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .references(() => chatSessions.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: chatMessageRoleEnum("role").notNull(),
    status: chatMessageStatusEnum("status").notNull().default("done"),
    blocks: jsonb("blocks").notNull(),
    textSearch: text("text_search"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_session_created_idx").on(table.sessionId, table.createdAt),
    index("chat_messages_user_session_created_idx").on(
      table.userId,
      table.sessionId,
      table.createdAt,
    ),
  ],
);

export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type ChatMessageInsert = typeof chatMessages.$inferInsert;

/*
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role chat_message_role NOT NULL,
  status chat_message_status NOT NULL DEFAULT 'done',
  blocks jsonb NOT NULL,
  text_search jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx
  ON chat_messages(session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS chat_messages_user_session_created_idx
  ON chat_messages(user_id, session_id, created_at DESC);
*/
