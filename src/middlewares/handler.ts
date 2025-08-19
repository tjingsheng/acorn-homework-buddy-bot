import type TelegramBot from "node-telegram-bot-api";
import type { BotContext, Middleware } from "./botContex.ts";
import { getActiveInlineKeyboards } from "./patchSendMessage.ts";

const activeInlineKeyboards = getActiveInlineKeyboards();

export function handler(
  bot: TelegramBot,
  middlewares: Middleware[]
): (input: TelegramBot.Message | TelegramBot.CallbackQuery) => Promise<void> {
  return async (input) => {
    const isMsg = isMessage(input);
    const isCallback = isCallbackQuery(input);

    const chatId = isMsg
      ? input.chat.id
      : isCallback
      ? input.message?.chat.id
      : undefined;

    if (typeof chatId !== "number") {
      console.error("Invalid or missing chat ID");
      return;
    }

    const ctx: BotContext = {
      bot,
      chatId: String(chatId),
      message: isMsg ? input : undefined,
      callbackQuery: isCallback ? input : undefined,
    };

    try {
      const tracked = activeInlineKeyboards.get(ctx.chatId);
      if (tracked) {
        activeInlineKeyboards.delete(ctx.chatId);

        if (!tracked.used) {
          await bot.editMessageText(
            `${tracked.originalText}\n\nYou did not select an option.`,
            {
              chat_id: chatId,
              message_id: tracked.messageId,
              reply_markup: { inline_keyboard: [] },
            }
          );
        } else {
          await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            {
              chat_id: chatId,
              message_id: tracked.messageId,
            }
          );
        }
      }

      let index = -1;
      const dispatch = async (i: number): Promise<void> => {
        if (i <= index) throw new Error("next() called multiple times");
        index = i;
        const fn = middlewares[i];
        if (fn) await fn(ctx, () => dispatch(i + 1));
      };

      await dispatch(0);
    } catch (err) {
      console.error("Middleware error:", err);
      if (isMsg) {
        await bot.sendMessage(chatId, "An internal error occurred.");
      } else if (isCallback) {
        await bot.answerCallbackQuery(input.id, {
          text: "An error occurred.",
          show_alert: true,
        });
      }
    }
  };
}

function isMessage(
  input: TelegramBot.Message | TelegramBot.CallbackQuery
): input is TelegramBot.Message {
  return "message_id" in input;
}

function isCallbackQuery(
  input: TelegramBot.Message | TelegramBot.CallbackQuery
): input is TelegramBot.CallbackQuery {
  return "id" in input && "data" in input;
}
