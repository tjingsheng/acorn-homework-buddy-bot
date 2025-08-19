import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";
import type TelegramBot from "node-telegram-bot-api";
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
    callback_data: CALLBACK_KEYS.SCHEDULE_MONTH(i + 1),
  }));

  await bot.sendMessage(chatId, "📅 Select a month:", {
    reply_markup: { inline_keyboard: chunk(months, 4) },
  });
};

export const handleScheduleCallback = async (
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
) => {
  const { message, data, id } = query;
  if (!message || !data) return;

  const chatId = String(message.chat.id);
  const state = scheduleState.get(chatId);
  if (!state) return;

  if (!data.startsWith(CALLBACK_KEYS.PREFIX.SCHEDULE)) return;

  const [_, part, value] = data.split("_");

  if (part === "month") {
    const month = parseInt(value) - 1;
    state.month = month;

    const daysInMonth = new Date(state.year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      text: `${i + 1}`.padStart(2, "0"),
      callback_data: CALLBACK_KEYS.SCHEDULE_DAY(i + 1),
    }));

    await bot.sendMessage(chatId, "📅 Select a day:", {
      reply_markup: { inline_keyboard: chunk(days, 7) },
    });
  }

  if (part === "day") {
    state.day = parseInt(value);

    const hours = Array.from({ length: 24 }, (_, i) => ({
      text: `${i}`.padStart(2, "0"),
      callback_data: CALLBACK_KEYS.SCHEDULE_HOUR(i),
    }));

    await bot.sendMessage(chatId, "🕒 Select an hour (UTC):", {
      reply_markup: { inline_keyboard: chunk(hours, 6) },
    });
  }

  if (part === "hour") {
    state.hour = parseInt(value);

    const minutes = [0, 15, 30, 45].map((m) => ({
      text: `${m}`.padStart(2, "0"),
      callback_data: CALLBACK_KEYS.SCHEDULE_MINUTE(m),
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

  await bot.answerCallbackQuery(id);
};

export const handleScheduleMessage = async (
  bot: TelegramBot,
  msg: TelegramBot.Message
) => {
  const chatId = String(msg.chat.id);
  const scheduledAt = awaitingMessage.get(chatId);
  const text = msg.text?.trim();

  if (!scheduledAt || !text) return;

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
    if (query.data?.startsWith(CALLBACK_KEYS.PREFIX.SCHEDULE)) {
      handleScheduleCallback(bot, query);
    }
  });

  bot.on("message", (msg) => {
    handleScheduleMessage(bot, msg);
  });
};
