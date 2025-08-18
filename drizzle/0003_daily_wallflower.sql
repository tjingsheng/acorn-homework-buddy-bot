ALTER TABLE "member" RENAME TO "user";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "member_chat_id_unique";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "user_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_chat_id_unique" UNIQUE("chat_id");