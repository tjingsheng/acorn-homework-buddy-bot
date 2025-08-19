import type TelegramBot from "node-telegram-bot-api";
import { activeInlineKeyboards } from "./sharedInlineKeyboardState.ts";

export function patchAnswerCallbackQuery(bot: TelegramBot) {
  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const data = query.data;

    if (!chatId || !messageId || !data) return;

    const tracked = activeInlineKeyboards.get(String(chatId));
    if (!tracked || tracked.messageId !== messageId) return;

    const selectedButton = tracked.buttons.find((b) => b.data === data);
    const selectedText = selectedButton?.text ?? "an option";

    try {
      await bot.editMessageText(
        `${tracked.originalText}\n\nYou selected: ${selectedText}`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] },
        }
      );
      tracked.used = true;
    } catch (err) {
      if (
        err.response?.body?.description?.includes("message is not modified")
      ) {
        // If the message edited is the same, telegram throws an error. We ignore it.
      } else {
        console.error("Failed to edit message:", err);
      }
    }

    await bot.answerCallbackQuery(query.id);
  });
}
