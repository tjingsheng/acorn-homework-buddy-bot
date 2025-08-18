import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";

export const scheduleCommand: Middleware = async (ctx) => {
  const input = ctx.message.text.replace("/schedule", "").trim();
  const [dateStr, ...messageParts] = input.split(" ");
  const message = messageParts.join(" ");

  if (!dateStr || !message) {
    await ctx.bot.sendMessage(
      ctx.chatId,
      `Usage: /schedule <ISO_DATE> <message>\nExample: /schedule 2025-08-18T15:30:00Z Hello future!`
    );
    return;
  }

  const scheduledAt = new Date(dateStr);

  if (isNaN(scheduledAt.getTime())) {
    await ctx.bot.sendMessage(
      ctx.chatId,
      "Invalid date format. Use ISO format (e.g. 2025-08-18T15:30:00Z)"
    );
    return;
  }

  await db.insert(scheduledMessage).values({
    message,
    scheduledAt,
  });

  await ctx.bot.sendMessage(
    ctx.chatId,
    `Scheduled your message for ${scheduledAt.toISOString()}`
  );
};
