import type TelegramBot from "node-telegram-bot-api";
import type { BotContext, Middleware } from "./botContex";
import { activeInlineKeyboards } from "../patches/sharedInlineKeyboardState.ts";

export function handler(
  bot: TelegramBot,
  middlewares: Middleware[]
): (input: TelegramBot.Message | TelegramBot.CallbackQuery) => Promise<void> {
  return async (input) => {
    const isMessage = isInputAMessage(input);
    const isCallbackQuery = isInputACallbackQuery(input);

    const chatId = isMessage
      ? input.chat.id
      : isCallbackQuery
      ? input.message?.chat.id
      : undefined;
    if (typeof chatId !== "number") {
      console.error("Invalid or missing chat ID");
      return;
    }

    const ctx: BotContext = {
      bot,
      chatId: String(chatId),
      message: isMessage ? input : undefined,
      callbackQuery: isCallbackQuery ? input : undefined,
    };

    // Mark the clicked message as used (so it won't be “did not select”)
    if (ctx.callbackQuery?.message) {
      const msgId = ctx.callbackQuery.message.message_id;
      const perChat = activeInlineKeyboards.get(ctx.chatId);
      const tracked = perChat?.get(msgId);
      if (tracked && !tracked.used) {
        tracked.used = true;
        perChat!.set(msgId, tracked);
        activeInlineKeyboards.set(ctx.chatId, perChat!);
      }
    }

    try {
      // Only clear on new text/command messages (NOT on callback taps)
      if (ctx.message) {
        await clearAllPreviousKeyboardsForChat(bot, ctx);
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
      if (isInputAMessage(input)) {
        await bot.sendMessage(chatId, "An internal error occurred.");
      } else if (isInputACallbackQuery(input)) {
        await bot.answerCallbackQuery(input.id, {
          text: "An error occurred.",
          show_alert: true,
        });
      }
    }
  };
}

function isInputAMessage(
  input: TelegramBot.Message | TelegramBot.CallbackQuery
): input is TelegramBot.Message {
  return "message_id" in input;
}

function isInputACallbackQuery(
  input: TelegramBot.Message | TelegramBot.CallbackQuery
): input is TelegramBot.CallbackQuery {
  return "id" in input && "data" in input;
}

/**
 * Clear ALL tracked inline keyboards for this chat when a new message arrives:
 * - If a tracked message wasn't used → append "You did not select..." and remove buttons.
 * - If it was used → just ensure buttons are cleared.
 */
async function clearAllPreviousKeyboardsForChat(
  bot: TelegramBot,
  ctx: BotContext
) {
  const perChat = activeInlineKeyboards.get(ctx.chatId);
  if (!perChat || perChat.size === 0) return;

  const chatIdNum = Number(ctx.chatId);

  for (const tracked of perChat.values()) {
    if (!tracked.used) {
      await bot.editMessageText(
        `${tracked.originalText}\n\nYou did not select an option.`,
        {
          chat_id: chatIdNum,
          message_id: tracked.messageId,
          reply_markup: { inline_keyboard: [] },
        }
      );
    } else {
      try {
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatIdNum, message_id: tracked.messageId }
        );
      } catch (err: any) {
        if (
          !err?.response?.body?.description?.includes("message is not modified")
        ) {
          throw err;
        }
      }
    }
  }

  // After clearing all, reset the map for this chat
  activeInlineKeyboards.delete(ctx.chatId);
}
