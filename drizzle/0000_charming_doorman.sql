CREATE TABLE "scheduled_message" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"scheduled_at" timestamp (3) with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"added_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"is_admin" boolean DEFAULT false,
	"first_name" text NOT NULL,
	"last_name" text,
	"user_name" text,
	CONSTRAINT "user_chat_id_unique" UNIQUE("chat_id")
);
