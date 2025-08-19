import { sql } from "drizzle-orm";
import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { statuses } from "../utils/index.ts";

export const scheduledMessage = pgTable("scheduled_message", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  scheduledAt: timestamp("scheduled_at", {
    precision: 3,
    withTimezone: true,
    mode: "date",
  }).notNull(),
  status: text({ enum: statuses }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const user = pgTable("user", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  addedAt: timestamp("added_at", {
    precision: 3,
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .default(sql`now()`),
  isAdmin: boolean("is_admin").default(false),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  userName: text("user_name"),
});
