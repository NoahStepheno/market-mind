import { pgEnum } from "drizzle-orm/pg-core";

export const notifyTierEnum = pgEnum("notify_tier", ["standard", "emphasis"]);

export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "failed"]);

export const alarmOutboxStatusEnum = pgEnum("alarm_outbox_status", [
  "pending",
  "processing",
  "completed",
]);

export const alarmFeedbackRatingEnum = pgEnum("alarm_feedback_rating", ["helpful", "not_helpful"]);

export const chatMessageRoleEnum = pgEnum("chat_message_role", ["user", "assistant", "system"]);

export const chatMessageStatusEnum = pgEnum("chat_message_status", ["streaming", "done"]);
