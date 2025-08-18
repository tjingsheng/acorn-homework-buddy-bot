CREATE TABLE "member" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"added_at" timestamp (3) with time zone NOT NULL,
	"is_admin" boolean,
	CONSTRAINT "member_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE "scheduled_message" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"scheduled_at" timestamp (3) with time zone NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
