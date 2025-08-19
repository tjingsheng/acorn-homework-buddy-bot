import { db } from "../db/index.ts";
import { user } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";
import type TelegramBot from "node-telegram-bot-api";
import { CALLBACK_KEYS } from "../callbackKeys.ts";
import { handler } from "../middlewares/handler.ts";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const awaitingPassword = new Map<number, TelegramBot.User>();

export const startCommand: Middleware = async (ctx) => {
  const { bot, chatId } = ctx;

  const msg = await bot.sendMessage(
    chatId,
    "Welcome! Please select your role:",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "I am a Teacher",
              callback_data: CALLBACK_KEYS.START.TEACHER,
            },
            {
              text: "I am a Student",
              callback_data: CALLBACK_KEYS.START.STUDENT,
            },
          ],
        ],
      },
    }
  );
};

export const handleStartCallbackQuery = async (
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
) => {
  const { message, data, from, id } = query;
  if (!message || !data) return;

  const chatId = message.chat.id;

  if (!data.startsWith(CALLBACK_KEYS.PREFIX.START)) return;

  let selectionText = "";

  if (data === CALLBACK_KEYS.START.STUDENT) {
    selectionText = "You selected Student.";

    await db
      .insert(user)
      .values({
        chatId: String(chatId),
        isAdmin: false,
        firstName: from.first_name,
        lastName: from.last_name,
        userName: from.username,
      })
      .onConflictDoUpdate({
        target: user.chatId,
        set: { isAdmin: false },
      });

    await bot.sendMessage(
      chatId,
      "You’ve been registered as a student. You will receive notifications here."
    );
  }

  if (data === CALLBACK_KEYS.START.TEACHER) {
    selectionText = "You selected Teacher.";

    awaitingPassword.set(chatId, from);
    await bot.sendMessage(chatId, "Please enter the teacher password:");
  }

  if (message.message_id && selectionText) {
    await bot.editMessageText(selectionText, {
      chat_id: chatId,
      message_id: message.message_id,
    });
  }

  await bot.answerCallbackQuery(id);
};

export const handleTeacherPasswordInput = async (
  bot: TelegramBot,
  msgCtx: TelegramBot.Message
) => {
  const chatId = msgCtx.chat.id;
  const from = msgCtx.from;

  if (!awaitingPassword.has(chatId)) return;
  if (awaitingPassword.get(chatId)?.id !== from?.id) return;

  const passwordAttempt = msgCtx.text?.trim();
  if (!passwordAttempt) {
    await bot.sendMessage(chatId, "Please enter a valid password.");
    return;
  }

  if (!ADMIN_PASSWORD) {
    await bot.sendMessage(
      chatId,
      "Server misconfigured: ADMIN_PASSWORD is not set."
    );
    awaitingPassword.delete(chatId);
    return;
  }

  if (passwordAttempt === ADMIN_PASSWORD) {
    await db
      .insert(user)
      .values({
        chatId: String(chatId),
        isAdmin: true,
        firstName: from?.first_name,
        lastName: from?.last_name,
        userName: from?.username,
      })
      .onConflictDoUpdate({
        target: user.chatId,
        set: { isAdmin: true },
      });

    await bot.sendMessage(
      chatId,
      "Welcome, teacher! You are now registered and can use admin features."
    );
  } else {
    await bot.sendMessage(
      chatId,
      "Incorrect password. Please try /start again."
    );
  }

  awaitingPassword.delete(chatId);
};

export const registerStartFunctionality = (bot: TelegramBot) => {
  bot.onText(/\/start/, handler(bot, [startCommand]));

  bot.on("callback_query", (query) => handleStartCallbackQuery(bot, query));

  bot.on("message", (msg) => handleTeacherPasswordInput(bot, msg));
};
