import type TelegramBot from "node-telegram-bot-api";
import type { BotContext, Middleware } from "./botContex.ts";
import { activeInlineKeyboards } from "../patches/sharedInlineKeyboardState.ts";

/**
 * Unified handler that:
 * 1) Marks inline keyboards as "used" when the update is a callback on the same message.
 * 2) Clears any previous inline keyboard (or warns if it was ignored).
 * 3) Runs the provided middlewares safely.
 */
export function handler(
  bot: TelegramBot,
  middlewares: Middleware[]
): (input: TelegramBot.Message | TelegramBot.CallbackQuery) => Promise<void> {
  return async (input) => {
    const isMsg = isMessage(input);
    const isCallback = isCallbackQuery(input);

    // Resolve chat ID from either a Message or a CallbackQuery
    const chatId = isMsg
      ? input.chat.id
      : isCallback
      ? input.message?.chat.id
      : undefined;

    if (typeof chatId !== "number") {
      console.error("Invalid or missing chat ID");
      return;
    }

    const ctx: BotContext = {
      bot,
      chatId: String(chatId),
      message: isMsg ? input : undefined,
      callbackQuery: isCallback ? input : undefined,
    };

    // If this update is a callback for the tracked message, mark it as "used"
    markTrackedKeyboardUsedIfSameMessage(ctx);

    try {
      // Clear the previous inline keyboard (or append "did not select" if ignored)
      await clearPreviousInlineKeyboard(bot, ctx);

      // Execute middlewares in order
      await runMiddlewares(middlewares, ctx);
    } catch (err) {
      console.error("Middleware error:", err);
      await respondWithError(bot, chatId, input);
    }
  };
}

/** Type guard: Message */
function isMessage(
  input: TelegramBot.Message | TelegramBot.CallbackQuery
): input is TelegramBot.Message {
  return "message_id" in input;
}

/** Type guard: CallbackQuery */
function isCallbackQuery(
  input: TelegramBot.Message | TelegramBot.CallbackQuery
): input is TelegramBot.CallbackQuery {
  return "id" in input && "data" in input;
}

/** Mark the tracked keyboard as "used" if this update is a callback on the same message */
function markTrackedKeyboardUsedIfSameMessage(ctx: BotContext) {
  const msgId = ctx.callbackQuery?.message?.message_id;
  if (!msgId) return;

  const tracked = activeInlineKeyboards.get(ctx.chatId);
  if (tracked && tracked.messageId === msgId) {
    tracked.used = true;
    activeInlineKeyboards.set(ctx.chatId, tracked);
  }
}

/**
 * Clear the previously tracked inline keyboard for this chat:
 * - If not used: append a warning and remove buttons.
 * - If used: just ensure buttons are removed (ignore "not modified" noise).
 * - Skip clearing if the current update is a callback for the same message.
 */
async function clearPreviousInlineKeyboard(bot: TelegramBot, ctx: BotContext) {
  const tracked = activeInlineKeyboards.get(ctx.chatId);
  if (!tracked) return;

  const isSameMessageAsCallback =
    ctx.callbackQuery?.message?.message_id === tracked.messageId;
  if (isSameMessageAsCallback) return; // let the callback-specific logic edit this one

  activeInlineKeyboards.delete(ctx.chatId);

  const chatIdNum = Number(ctx.chatId);

  if (!tracked.used) {
    await bot.editMessageText(
      `${tracked.originalText}\n\nYou did not select an option.`,
      {
        chat_id: chatIdNum,
        message_id: tracked.messageId,
        reply_markup: { inline_keyboard: [] },
      }
    );
    return;
  }

  // Selection was made → just clear buttons if still present
  try {
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatIdNum, message_id: tracked.messageId }
    );
  } catch (err: any) {
    // Ignore harmless "message is not modified" errors from Telegram
    if (
      !err?.response?.body?.description?.includes("message is not modified")
    ) {
      throw err;
    }
  }
}

/** Run middlewares in sequence with a simple dispatcher */
async function runMiddlewares(middlewares: Middleware[], ctx: BotContext) {
  let index = -1;

  const dispatch = async (i: number): Promise<void> => {
    if (i <= index) throw new Error("next() called multiple times");
    index = i;

    const fn = middlewares[i];
    if (fn) await fn(ctx, () => dispatch(i + 1));
  };

  await dispatch(0);
}

/** Friendly error responses for Message vs CallbackQuery */
async function respondWithError(
  bot: TelegramBot,
  chatId: number,
  input: TelegramBot.Message | TelegramBot.CallbackQuery
) {
  if (isMessage(input)) {
    await bot.sendMessage(chatId, "An internal error occurred.");
  } else if (isCallbackQuery(input)) {
    await bot.answerCallbackQuery(input.id, {
      text: "An error occurred.",
      show_alert: true,
    });
  }
}
