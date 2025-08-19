import type TelegramBot from "node-telegram-bot-api";
import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { formatDateSingapore } from "../util.ts";
import { type Middleware } from "../middlewares/botContex.ts";
import { CALLBACK_KEYS } from "../middlewares/callbackKeys.ts";
import { handler } from "../middlewares/handler.ts";
import { withAdminAuth } from "../middlewares/withAdminAuth.ts";
import { eq, ne } from "drizzle-orm";

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
            ],
          ],
        },
      }
    );
  }
};

export const deleteScheduledMessageHandler: Middleware = async (ctx) => {
  const { callbackQuery, bot, chatId } = ctx;
  const data = callbackQuery?.data;
  if (!data?.startsWith(CALLBACK_KEYS.PREFIX.MANAGE)) return;

  const id = parseInt(data.split("_")[2], 10);
  await db
    .update(scheduledMessage)
    .set({ status: "deleted" })
    .where(eq(scheduledMessage.id, id));

  await bot.answerCallbackQuery(callbackQuery.id, { text: "Deleted!" });

  if (callbackQuery.message?.message_id) {
    await bot.editMessageText("Message deleted.", {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
    });
  }
};

export const registerManageMessagesFunctionality = (bot: TelegramBot) => {
  bot.onText(
    /^\/manage_messages$/,
    handler(bot, [withAdminAuth, manageMessagesCommand])
  );

  bot.on("callback_query", (query) => {
    const d = query.data;
    if (!d?.startsWith(CALLBACK_KEYS.PREFIX.MANAGE)) return;
    handler(bot, [withAdminAuth, deleteScheduledMessageHandler])(query);
  });
};
