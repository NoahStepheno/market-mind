CREATE TYPE "public"."alarm_feedback_rating" AS ENUM('helpful', 'not_helpful');--> statement-breakpoint
CREATE TYPE "public"."alarm_outbox_status" AS ENUM('pending', 'processing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notify_tier" AS ENUM('standard', 'emphasis');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alarm_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alarm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" "alarm_feedback_rating" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alarm_trigger_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alarm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "alarm_outbox_status" DEFAULT 'pending' NOT NULL,
	"picked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "alarm_trigger_outbox_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "alarms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(64) NOT NULL,
	"condition_group" jsonb NOT NULL,
	"cooldown_seconds" integer DEFAULT 900 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"notify_label" varchar(64),
	"notify_tier" "notify_tier" DEFAULT 'standard' NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"last_match_state" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" varchar(64) NOT NULL,
	"source_id" text,
	"dedupe_key" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"notify_tier" "notify_tier" NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" varchar(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alarm_feedback" ADD CONSTRAINT "alarm_feedback_alarm_id_alarms_id_fk" FOREIGN KEY ("alarm_id") REFERENCES "public"."alarms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alarm_feedback" ADD CONSTRAINT "alarm_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alarm_trigger_outbox" ADD CONSTRAINT "alarm_trigger_outbox_alarm_id_alarms_id_fk" FOREIGN KEY ("alarm_id") REFERENCES "public"."alarms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alarm_trigger_outbox" ADD CONSTRAINT "alarm_trigger_outbox_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alarms" ADD CONSTRAINT "alarms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_uq" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "alarm_feedback_alarm_id_idx" ON "alarm_feedback" USING btree ("alarm_id");--> statement-breakpoint
CREATE INDEX "alarm_feedback_user_id_idx" ON "alarm_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alarm_trigger_outbox_status_created_idx" ON "alarm_trigger_outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "alarm_trigger_outbox_processing_stale_idx" ON "alarm_trigger_outbox" USING btree ("status","picked_at");--> statement-breakpoint
CREATE INDEX "alarms_user_id_idx" ON "alarms" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alarms_symbol_eval_idx" ON "alarms" USING btree ("symbol","enabled","deleted_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_source_idx" ON "notifications" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");