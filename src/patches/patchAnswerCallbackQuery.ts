import type TelegramBot from "node-telegram-bot-api";
import { activeInlineKeyboards } from "./sharedInlineKeyboardState.ts";

export function patchAnswerCallbackQuery(bot: TelegramBot) {
  bot.on("callback_query", async (query) => {
    const msg = query.message;
    const data = query.data;
    if (!msg || !data) return;

    const chatKey = String(msg.chat.id);
    const perChat = activeInlineKeyboards.get(chatKey);
    if (!perChat) return;

    const tracked = perChat.get(msg.message_id);
    if (!tracked) return;

    const selected = tracked.buttons.find((b) => b.data === data);
    const selectedText = selected?.text ?? "an option";

    tracked.used = true;
    perChat.set(tracked.messageId, tracked);
    activeInlineKeyboards.set(chatKey, perChat);

    try {
      await bot.editMessageText(
        `${tracked.originalText}\n\n✅ You selected: ${selectedText}`,
        {
          chat_id: msg.chat.id,
          message_id: tracked.messageId,
          reply_markup: { inline_keyboard: [] },
        }
      );
    } catch (err: any) {
      if (
        !err?.response?.body?.description?.includes("message is not modified")
      ) {
        console.error("Failed to edit message after selection:", err);
      }
    }

    try {
      await bot.answerCallbackQuery(query.id);
    } catch {
      /* noop */
    }
  });
}
