import TelegramBot from "node-telegram-bot-api";

import { scheduledMessage } from "./db/schema.ts";
import { db } from "./db/index.ts";

export function registerBotHandlers(bot: TelegramBot) {
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Hello from /start command");
  });

  bot.onText(/\/testing/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const result = await db.select().from(scheduledMessage);

      console.log("result", result);

      await bot.sendMessage(
        chatId,
        `DB Test 1: ${JSON.stringify(result)} scheduled messages.`
      );
    } catch (err) {
      console.error("Error in /testing:", err);
      await bot.sendMessage(chatId, `DB Test failed: ${err.message}`);
    }
  });
}
