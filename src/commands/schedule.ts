import type TelegramBot from "node-telegram-bot-api";
import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";
import { CALLBACK_KEYS } from "../middlewares/callbackKeys.ts";
import { handler } from "../middlewares/handler.ts";
import { withAdminAuth } from "../middlewares/withAdminAuth.ts";

const scheduleState = new Map<
  string,
  { year: number; month?: number; day?: number; hour?: number; minute?: number }
>();

const awaitingMessage = new Map<string, Date>();

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

export const scheduleCommand: Middleware = async (ctx) => {
  const { bot, chatId } = ctx;
  const now = new Date();

  scheduleState.set(chatId, { year: now.getUTCFullYear() });

  const months = Array.from({ length: 12 }, (_, i) => ({
    text: `${i + 1}`.padStart(2, "0"),
    callback_data: CALLBACK_KEYS.SCHEDULE.MONTH(i + 1),
  }));

  await bot.sendMessage(chatId, "📅 Select a month:", {
    reply_markup: { inline_keyboard: chunk(months, 4) },
  });
};

export const scheduleCallbackHandler: Middleware = async (ctx) => {
  const { callbackQuery, bot, chatId } = ctx;
  if (!callbackQuery?.data) return;

  const data = callbackQuery.data;
  const state = scheduleState.get(chatId);
  if (!state || !data.startsWith(CALLBACK_KEYS.PREFIX.SCHEDULE)) return;

  const [_, part, value] = data.split("_");

  if (part === "month") {
    const month = parseInt(value) - 1;
    state.month = month;

    const daysInMonth = new Date(state.year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      text: `${i + 1}`.padStart(2, "0"),
      callback_data: CALLBACK_KEYS.SCHEDULE.DAY(i + 1),
    }));

    await bot.sendMessage(chatId, "📅 Select a day:", {
      reply_markup: { inline_keyboard: chunk(days, 7) },
    });
  }

  if (part === "day") {
    state.day = parseInt(value);

    const hours = Array.from({ length: 24 }, (_, i) => ({
      text: `${i}`.padStart(2, "0"),
      callback_data: CALLBACK_KEYS.SCHEDULE.HOUR(i),
    }));

    await bot.sendMessage(chatId, "🕒 Select an hour (UTC):", {
      reply_markup: { inline_keyboard: chunk(hours, 6) },
    });
  }

  if (part === "hour") {
    state.hour = parseInt(value);

    const minutes = [0, 15, 30, 45].map((m) => ({
      text: `${m}`.padStart(2, "0"),
      callback_data: CALLBACK_KEYS.SCHEDULE.MINUTE(m),
    }));

    await bot.sendMessage(chatId, "🕓 Select minutes:", {
      reply_markup: { inline_keyboard: [minutes] },
    });
  }

  if (part === "minute") {
    state.minute = parseInt(value);

    const date = new Date(
      Date.UTC(
        state.year!,
        state.month!,
        state.day!,
        state.hour!,
        state.minute!
      )
    );

    awaitingMessage.set(chatId, date);
    scheduleState.delete(chatId);

    await bot.sendMessage(
      chatId,
      `📝 Now send the message to schedule for:\n*${date.toUTCString()}*`,
      { parse_mode: "Markdown" }
    );
  }

  await bot.answerCallbackQuery(callbackQuery.id);
};

export const scheduleMessageHandler: Middleware = async (ctx) => {
  const { bot, message, chatId } = ctx;
  if (!message || !message.text?.trim()) return;

  const text = message.text.trim();
  const scheduledAt = awaitingMessage.get(chatId);
  if (!scheduledAt) return;

  await db.insert(scheduledMessage).values({ scheduledAt, message: text });
  awaitingMessage.delete(chatId);

  await bot.sendMessage(
    chatId,
    `✅ Scheduled your message for ${scheduledAt.toUTCString()}`
  );
};

export const registerScheduleFunctionality = (bot: TelegramBot) => {
  bot.onText(
    /^\/schedule(?:\s+.+)?$/,
    handler(bot, [withAdminAuth, scheduleCommand])
  );

  bot.on("callback_query", (query) => {
    const isSchedule = query.data?.startsWith(CALLBACK_KEYS.PREFIX.SCHEDULE);
    if (!isSchedule) return;
    handler(bot, [withAdminAuth, scheduleCallbackHandler])(query);
  });

  bot.on("message", handler(bot, [scheduleMessageHandler]));
};
