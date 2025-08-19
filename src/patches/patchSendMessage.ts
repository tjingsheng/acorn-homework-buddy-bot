import type TelegramBot from "node-telegram-bot-api";
import {
  activeInlineKeyboards,
  type TrackedMessage,
} from "./sharedInlineKeyboardState.ts";

export function patchSendMessage(bot: TelegramBot) {
  const original = bot.sendMessage.bind(bot);

  bot.sendMessage = async function (chatId, text, options) {
    const message = await original(chatId, text, options);

    let markup: any = options?.reply_markup;
    if (typeof markup === "string") {
      try {
        markup = JSON.parse(markup);
      } catch {
        markup = null;
      }
    }

    const keyboard = markup?.inline_keyboard as
      | TelegramBot.InlineKeyboardButton[][]
      | undefined;
    if (Array.isArray(keyboard)) {
      const buttons = keyboard
        .flat()
        .filter((b) => b.text && b.callback_data)
        .map((b) => ({ text: b.text, data: b.callback_data! }));

      const chatKey = String(chatId);
      const perChat =
        activeInlineKeyboards.get(chatKey) ?? new Map<number, TrackedMessage>();
      perChat.set(message.message_id, {
        messageId: message.message_id,
        originalText: String(text ?? ""),
        buttons,
        used: false,
      });
      activeInlineKeyboards.set(chatKey, perChat);
    }

    return message;
  };
}
