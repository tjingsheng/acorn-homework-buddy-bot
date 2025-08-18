import TelegramBot from "node-telegram-bot-api";
import { type BotContext, type Middleware } from "./botContex.ts";

export function handler(
  bot: TelegramBot,
  middlewares: Middleware[]
): (msg: TelegramBot.Message) => Promise<void> {
  return async (msg: TelegramBot.Message) => {
    const chatId = msg.chat?.id;

    if (typeof chatId !== "number") {
      console.error("Invalid or missing chat ID");
      return;
    }

    const ctx: BotContext = {
      bot,
      message: msg,
      chatId: String(chatId),
    };

    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }

      index = i;
      const fn = middlewares[i];

      if (fn) {
        await fn(ctx, () => dispatch(i + 1));
      }
    };

    try {
      await dispatch(0);
    } catch (err) {
      console.error("Middleware error:", err);
      await bot.sendMessage(chatId, "An internal error occurred.");
    }
  };
}
