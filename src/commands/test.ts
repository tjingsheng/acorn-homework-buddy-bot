import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";
import type TelegramBot from "node-telegram-bot-api";
import { handler } from "../middlewares/handler.ts";
import { withAdminAuth } from "../middlewares/withAdminAuth.ts";

export const testCommand: Middleware = async (ctx) => {
  const result = await db.select().from(scheduledMessage);
  await ctx.bot.sendMessage(
    ctx.chatId,
    `📊 DB Test: Found ${result.length} scheduled messages.`
  );
};

export const registerTestFunctionality = (bot: TelegramBot) => {
  bot.onText(/\/test/, handler(bot, [withAdminAuth, testCommand]));
};
