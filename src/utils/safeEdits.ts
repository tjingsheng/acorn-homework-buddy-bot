import TelegramBot from "node-telegram-bot-api";

export function isNotModifiedError(err: any) {
  return !!err?.response?.body?.description?.includes(
    "message is not modified"
  );
}

export async function safeEditMessageText(
  bot: TelegramBot,
  ...args: Parameters<TelegramBot["editMessageText"]>
) {
  try {
    return await bot.editMessageText(...args);
  } catch (err) {
    if (!isNotModifiedError(err)) throw err;
    return undefined;
  }
}

export async function safeEditMessageReplyMarkup(
  bot: TelegramBot,
  ...args: Parameters<TelegramBot["editMessageReplyMarkup"]>
) {
  try {
    return await bot.editMessageReplyMarkup(...args);
  } catch (err) {
    if (!isNotModifiedError(err)) throw err;
    return undefined;
  }
}
