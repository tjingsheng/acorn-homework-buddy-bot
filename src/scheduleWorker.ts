import { db } from "./db/index.ts";
import { lt, eq, and } from "drizzle-orm";
import TelegramBot from "node-telegram-bot-api";
import { scheduledMessage, user } from "./db/schema.ts";

export function startScheduledMessageWorker(bot: TelegramBot) {
  setInterval(async () => {
    const now = new Date();

    const messages = await db
      .select()
      .from(scheduledMessage)
      .where(
        and(
          lt(scheduledMessage.scheduledAt, now),
          eq(scheduledMessage.status, "pending")
        )
      );

    if (messages.length === 0) return;

    const users = await db.select().from(user);

    if (users.length === 0) return;

    for (const msg of messages) {
      const sendTasks = users.map((u) =>
        bot.sendMessage(u.chatId, msg.message).catch((err) => {
          console.error(`[Worker] Failed to send to ${u.chatId}:`, err);
        })
      );

      await Promise.all(sendTasks);

      await db
        .update(scheduledMessage)
        .set({ status: "sent" })
        .where(eq(scheduledMessage.id, msg.id));

      console.log(
        `[Worker] Broadcasted message ${msg.id} to ${users.length} users.`
      );
    }
  }, 5_000);
}
