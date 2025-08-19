import type TelegramBot from "node-telegram-bot-api";
import {
  activeInlineKeyboards,
  type TrackedMessage,
} from "./sharedInlineKeyboardState.ts";

export function patchSendMessage(bot: TelegramBot) {
  const originalSendMessage = bot.sendMessage.bind(bot);

  bot.sendMessage = async function (chatId, text, options) {
    const message = await originalSendMessage(chatId, text, options);

    let markup: any = options?.reply_markup;

    if (typeof markup === "string") {
      try {
        markup = JSON.parse(markup);
      } catch {
        markup = null;
      }
    }

    const isInlineKeyboard =
      markup &&
      typeof markup === "object" &&
      "inline_keyboard" in markup &&
      Array.isArray(markup.inline_keyboard);

    if (isInlineKeyboard) {
      const buttons = (
        markup.inline_keyboard as TelegramBot.InlineKeyboardButton[][]
      )
        .flat()
        .filter((btn) => btn.text && btn.callback_data)
        .map((btn) => ({
          text: btn.text,
          data: btn.callback_data!,
        }));

      const tracked: TrackedMessage = {
        messageId: message.message_id,
        originalText: text,
        buttons,
        used: false,
      };

      activeInlineKeyboards.set(String(chatId), tracked);
    }

    return message;
  };
}
