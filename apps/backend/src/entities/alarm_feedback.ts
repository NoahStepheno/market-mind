import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { alarms } from "./alarms.ts";
import { alarmFeedbackRatingEnum } from "./enums.ts";
import { users } from "./users.ts";

export const alarmFeedback = pgTable(
  "alarm_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alarmId: uuid("alarm_id")
      .references(() => alarms.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    rating: alarmFeedbackRatingEnum("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("alarm_feedback_alarm_id_idx").on(table.alarmId),
    index("alarm_feedback_user_id_idx").on(table.userId),
  ],
);
