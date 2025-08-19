import type TelegramBot from "node-telegram-bot-api";

type TrackedKeyboard = {
  messageId: number;
  originalText: string;
  used: boolean;
};

const activeInlineKeyboards = new Map<string, TrackedKeyboard>();

export const getActiveInlineKeyboards = () => activeInlineKeyboards;

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

    if (
      markup &&
      typeof markup === "object" &&
      Array.isArray((markup as any).inline_keyboard)
    ) {
      activeInlineKeyboards.set(String(chatId), {
        messageId: message.message_id,
        originalText: String(text),
        used: false,
      });
    }

    return message;
  };
}
