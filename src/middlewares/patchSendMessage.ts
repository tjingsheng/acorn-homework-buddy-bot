import type TelegramBot from "node-telegram-bot-api";

const activeInlineKeyboards = new Map<string, number>();

export const getActiveInlineKeyboards = () => activeInlineKeyboards;

export function patchSendMessage(bot: TelegramBot) {
  const originalSendMessage = bot.sendMessage.bind(bot);

  bot.sendMessage = async function (chatId, text, options) {
    const message = await originalSendMessage(chatId, text, options);

    let markup: any = options?.reply_markup;

    if (typeof markup === "string") {
      try {
        markup = JSON.parse(markup);
      } catch (err) {
        markup = null;
      }
    }

    const isInlineKeyboard =
      markup &&
      typeof markup === "object" &&
      "inline_keyboard" in markup &&
      Array.isArray((markup as any).inline_keyboard);

    if (isInlineKeyboard) {
      activeInlineKeyboards.set(String(chatId), message.message_id);
    }

    return message;
  };
}
