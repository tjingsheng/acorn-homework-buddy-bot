import type TelegramBot from "node-telegram-bot-api";
import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";
import { CALLBACK_KEYS } from "../callbackKeys.ts";
import { handler } from "../middlewares/handler.ts";
import { withAdminAuth } from "../middlewares/withAdminAuth.ts";
import { eq, ne } from "drizzle-orm";
import { formatDateSingapore } from "../utils/index.ts";

const awaitingEdit = new Map<
  string,
  { scheduledId: number; sourceMessageId: number }
>();

export const manageMessagesCommand: Middleware = async (ctx) => {
  const { bot, chatId } = ctx;

  const messages = await db
    .select()
    .from(scheduledMessage)
    .where(ne(scheduledMessage.status, "deleted"))
    .orderBy(scheduledMessage.scheduledAt);

  if (messages.length === 0) {
    await bot.sendMessage(chatId, "There are no scheduled messages.");
    return;
  }

  for (const msg of messages) {
    await bot.sendMessage(
      chatId,
      `${formatDateSingapore(msg.scheduledAt)}\n${msg.message}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Delete",
                callback_data: CALLBACK_KEYS.MANAGE.DELETE_MESSAGE(msg.id),
              },
              {
                text: "Edit",
                callback_data: CALLBACK_KEYS.MANAGE.EDIT_MESSAGE(msg.id),
              },
            ],
          ],
        },
      }
    );
  }
};

export const manageCallbackHandler: Middleware = async (ctx) => {
  const { callbackQuery, bot, chatId } = ctx;
  const data = callbackQuery?.data;
  if (!data?.startsWith(CALLBACK_KEYS.PREFIX.MANAGE)) return;

  if (data.startsWith("manage_delete_")) {
    const id = parseInt(data.split("_")[2], 10);

    await db
      .update(scheduledMessage)
      .set({ status: "deleted" })
      .where(eq(scheduledMessage.id, id));

    await bot.answerCallbackQuery(callbackQuery!.id, { text: "Deleted!" });
    return;
  }

  if (data.startsWith("manage_edit_")) {
    const id = parseInt(data.split("_")[2], 10);

    awaitingEdit.set(chatId, {
      scheduledId: id,
      sourceMessageId: callbackQuery!.message!.message_id!,
    });

    await bot.answerCallbackQuery(callbackQuery!.id);
    await bot.sendMessage(
      chatId,
      "Please send the new text for this scheduled message."
    );
    return;
  }
};

export const manageEditTextHandler: Middleware = async (ctx) => {
  const { bot, chatId, message } = ctx;
  const pending = awaitingEdit.get(chatId);
  if (!pending) return;

  const newText = message?.text?.trim();
  if (!newText) return;

  await db
    .update(scheduledMessage)
    .set({ message: newText })
    .where(eq(scheduledMessage.id, pending.scheduledId));

  const rows = await db
    .select()
    .from(scheduledMessage)
    .where(eq(scheduledMessage.id, pending.scheduledId));

  const row = rows[0];
  if (!row) {
    awaitingEdit.delete(chatId);
    await bot.sendMessage(
      chatId,
      "Could not find that scheduled message anymore."
    );
    return;
  }

  awaitingEdit.delete(chatId);
  await bot.sendMessage(chatId, "Message updated.");
};

export const registerManageMessagesFunctionality = (bot: TelegramBot) => {
  bot.onText(
    /^\/manage_messages$/,
    handler(bot, [withAdminAuth, manageMessagesCommand])
  );

  bot.on("callback_query", (query) => {
    const d = query.data;
    if (!d?.startsWith(CALLBACK_KEYS.PREFIX.MANAGE)) return;
    handler(bot, [withAdminAuth, manageCallbackHandler])(query);
  });

  bot.on("message", handler(bot, [withAdminAuth, manageEditTextHandler]));
};
