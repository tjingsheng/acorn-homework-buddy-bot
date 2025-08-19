import { db } from "../db/index.ts";
import { user } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";
import type TelegramBot from "node-telegram-bot-api";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const awaitingPassword = new Map<number, TelegramBot.User>();

export const startCommand: Middleware = async (ctx) => {
  const { bot, chatId } = ctx;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "👨‍🏫 I am a Teacher", callback_data: "start_teacher" },
        { text: "🎓 I am a Student", callback_data: "start_student" },
      ],
    ],
  };

  await bot.sendMessage(chatId, "👋 Welcome! Please select your role:", {
    reply_markup: keyboard,
  });
};

export const registerStartInteractions = (bot: TelegramBot) => {
  bot.on("callback_query", async (query) => {
    const { message, data, from, id } = query;
    if (!message || !data) return;

    const chatId = message.chat.id;

    if (data === "start_student") {
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
        "🎓 You’ve been registered as a student. You'll receive notifications here."
      );
    }

    if (data === "start_teacher") {
      awaitingPassword.set(chatId, from);
      await bot.sendMessage(chatId, "🔐 Please enter the teacher password:");
    }

    await bot.answerCallbackQuery(id);
  });

  bot.on("message", async (msgCtx) => {
    const chatId = msgCtx.chat.id;
    const from = msgCtx.from;

    if (!awaitingPassword.has(chatId)) return;
    if (awaitingPassword.get(chatId)?.id !== from?.id) return;

    const passwordAttempt = msgCtx.text?.trim();
    if (!passwordAttempt) {
      await bot.sendMessage(chatId, "❗ Please enter a valid password.");
      return;
    }

    if (!ADMIN_PASSWORD) {
      await bot.sendMessage(
        chatId,
        "⚠️ Server misconfigured: ADMIN_PASSWORD is not set."
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
        "✅ Welcome, teacher! You are now registered and can use admin features."
      );
    } else {
      await bot.sendMessage(
        chatId,
        "❌ Incorrect password. Please try /start again."
      );
    }

    awaitingPassword.delete(chatId);
  });
};
