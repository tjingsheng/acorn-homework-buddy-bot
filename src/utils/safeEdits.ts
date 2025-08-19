import TelegramBot from "node-telegram-bot-api";

export function isNotModifiedError(err: any) {
  return !!err?.response?.body?.description?.includes(
    "message is not modified"
  );
}

export async function safeEditMessageText(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: TelegramBot.InlineKeyboardMarkup
) {
  try {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    });
  } catch (err) {
    if (!isNotModifiedError(err)) throw err;
  }
}

export async function safeEditMessageReplyMarkup(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  replyMarkup?: TelegramBot.InlineKeyboardMarkup
) {
  try {
    await bot.editMessageReplyMarkup(replyMarkup, {
      chat_id: chatId,
      message_id: messageId,
    });
  } catch (err) {
    if (!isNotModifiedError(err)) throw err;
  }
}
