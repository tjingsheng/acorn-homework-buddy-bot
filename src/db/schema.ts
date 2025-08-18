import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const scheduledMessage = pgTable("scheduled_message", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  scheduledAt: timestamp("scheduled_at", {
    precision: 3,
    withTimezone: true,
    mode: "date",
  }).notNull(),
  sent: boolean("sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const members = pgTable("member", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  addedAt: timestamp("added_at", {
    precision: 3,
    withTimezone: true,
    mode: "date",
  }).notNull(),
  isAdmin: boolean("is_admin"),
});
