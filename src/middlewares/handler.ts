import type TelegramBot from "node-telegram-bot-api";
import type { BotContext, Middleware } from "./botContex";
import { activeInlineKeyboards } from "../patches/sharedInlineKeyboardState.ts";
import {
  safeEditMessageReplyMarkup,
  safeEditMessageText,
} from "../utils/safeEdits.ts";

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

    // If this update is a callback for a tracked message, mark that message as used
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

      // run middlewares
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
 * Idempotent: ignores "message is not modified" and removes cleared entries from the map.
 */
async function clearAllPreviousKeyboardsForChat(
  bot: TelegramBot,
  ctx: BotContext
) {
  const perChat = activeInlineKeyboards.get(ctx.chatId);
  if (!perChat || perChat.size === 0) return;

  const chatIdNum = Number(ctx.chatId);
  const toDelete: number[] = []; // messageIds to remove from tracking after clearing

  for (const tracked of perChat.values()) {
    if (!tracked.used) {
      // Add suffix only if not already present (prevents identical text edits)
      const suffix = "\n\nYou did not select an option.";
      const newText = tracked.originalText.endsWith(suffix)
        ? tracked.originalText
        : `${tracked.originalText}${suffix}`;

      await safeEditMessageText(bot, chatIdNum, tracked.messageId, newText, {
        inline_keyboard: [],
      });
    } else {
      await safeEditMessageReplyMarkup(bot, chatIdNum, tracked.messageId, {
        inline_keyboard: [],
      });
    }

    // Mark this entry for removal so we don't try to clear it again later
    toDelete.push(tracked.messageId);
  }

  // Remove cleared entries (don’t drop the whole chat map if you’re about to add new entries soon)
  for (const mid of toDelete) perChat.delete(mid);
  if (perChat.size === 0) {
    activeInlineKeyboards.delete(ctx.chatId);
  } else {
    activeInlineKeyboards.set(ctx.chatId, perChat);
  }
}
