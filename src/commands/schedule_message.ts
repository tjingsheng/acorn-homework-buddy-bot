// Updated Schedule Message Bot with Cancel and Preview
import type TelegramBot from "node-telegram-bot-api";
import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";
import { CALLBACK_KEYS } from "../middlewares/callbackKeys.ts";
import { handler } from "../middlewares/handler.ts";
import { withAdminAuth } from "../middlewares/withAdminAuth.ts";

const scheduleState = new Map<
  string,
  {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
  }
>();

const awaitingMessage = new Map<string, Date>();
const awaitingConfirmation = new Map<string, { date: Date; message: string }>();

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

function withCancel(
  buttons: TelegramBot.InlineKeyboardButton[][]
): TelegramBot.InlineKeyboardButton[][] {
  return [
    ...buttons,
    [{ text: "❌ Cancel", callback_data: CALLBACK_KEYS.SCHEDULE.CANCEL }],
  ];
}

export const scheduleCommand: Middleware = async (ctx) => {
  const { bot, chatId } = ctx;
  const now = new Date();
  scheduleState.set(chatId, {});

  const currentYear = now.getUTCFullYear();
  const years = [currentYear, currentYear + 1].map((year) => ({
    text: `${year}`,
    callback_data: CALLBACK_KEYS.SCHEDULE.YEAR(year),
  }));

  await bot.sendMessage(chatId, "📅 Select a year:", {
    reply_markup: { inline_keyboard: withCancel([years]) },
  });
};

export const scheduleCallbackHandler: Middleware = async (ctx) => {
  const { callbackQuery, bot, chatId } = ctx;
  if (!callbackQuery?.data) return;
  const data = callbackQuery.data;

  if (!data.startsWith(CALLBACK_KEYS.PREFIX.SCHEDULE)) return;
  if (data === CALLBACK_KEYS.SCHEDULE.CANCEL) {
    scheduleState.delete(chatId);
    awaitingMessage.delete(chatId);
    awaitingConfirmation.delete(chatId);
    await bot.sendMessage(chatId, "❌ Schedule cancelled.");
    await bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  if (!scheduleState.has(chatId)) scheduleState.set(chatId, {});
  const state = scheduleState.get(chatId)!;

  const [_, part, value] = data.split("_");

  switch (part) {
    case "year": {
      state.year = parseInt(value);
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].map((name, i) => ({
        text: name,
        callback_data: CALLBACK_KEYS.SCHEDULE.MONTH(i + 1),
      }));
      await bot.sendMessage(chatId, "📅 Select a month:", {
        reply_markup: { inline_keyboard: withCancel(chunk(months, 3)) },
      });
      break;
    }

    case "month": {
      state.month = parseInt(value) - 1;
      if (state.year === undefined) return;

      const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => ({
        text: `${i + 1}`.padStart(2, "0"),
        callback_data: CALLBACK_KEYS.SCHEDULE.DAY(i + 1),
      }));
      await bot.sendMessage(chatId, "📅 Select a day:", {
        reply_markup: { inline_keyboard: withCancel(chunk(days, 7)) },
      });
      break;
    }

    case "day": {
      state.day = parseInt(value);
      const hours = Array.from({ length: 24 }, (_, i) => ({
        text: `${i}`.padStart(2, "0"),
        callback_data: CALLBACK_KEYS.SCHEDULE.HOUR(i),
      }));
      await bot.sendMessage(chatId, "🕒 Select an hour (UTC):", {
        reply_markup: { inline_keyboard: withCancel(chunk(hours, 6)) },
      });
      break;
    }

    case "hour": {
      state.hour = parseInt(value);
      const minutes = [0, 15, 30, 45].map((m) => ({
        text: `${m}`.padStart(2, "0"),
        callback_data: CALLBACK_KEYS.SCHEDULE.MINUTE(m),
      }));
      await bot.sendMessage(chatId, "🕓 Select minutes:", {
        reply_markup: { inline_keyboard: withCancel([minutes]) },
      });
      break;
    }

    case "minute": {
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
      break;
    }
  }

  await bot.answerCallbackQuery(callbackQuery.id);
};

export const scheduleMessageHandler: Middleware = async (ctx) => {
  const { bot, message, chatId } = ctx;
  if (!message?.text?.trim()) return;
  const scheduledAt = awaitingMessage.get(chatId);
  if (!scheduledAt) return;

  awaitingConfirmation.set(chatId, {
    date: scheduledAt,
    message: message.text.trim(),
  });
  awaitingMessage.delete(chatId);

  await bot.sendMessage(
    chatId,
    `📤 Preview:\n\n"${message.text.trim()}"\n\nScheduled for: *${scheduledAt.toUTCString()}*`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Confirm",
              callback_data: CALLBACK_KEYS.SCHEDULE.CONFIRM,
            },
            { text: "❌ Cancel", callback_data: CALLBACK_KEYS.SCHEDULE.CANCEL },
          ],
        ],
      },
    }
  );
};

export const previewConfirmationHandler: Middleware = async (ctx) => {
  const { bot, callbackQuery, chatId } = ctx;
  if (!callbackQuery?.data) return;
  if (callbackQuery.data !== CALLBACK_KEYS.SCHEDULE.CONFIRM) return;

  const confirm = awaitingConfirmation.get(chatId);
  if (!confirm) return;

  await db.insert(scheduledMessage).values({
    scheduledAt: confirm.date,
    message: confirm.message,
  });

  awaitingConfirmation.delete(chatId);

  await bot.sendMessage(
    chatId,
    `✅ Scheduled your message for ${confirm.date.toUTCString()}`
  );
  await bot.answerCallbackQuery(callbackQuery.id);
};

export const registerScheduleMessageFunctionality = (bot: TelegramBot) => {
  bot.onText(
    /^\/schedule_message(?:\s+.+)?$/,
    handler(bot, [withAdminAuth, scheduleCommand])
  );

  bot.on("callback_query", (query) => {
    const data = query.data;
    if (!data?.startsWith(CALLBACK_KEYS.PREFIX.SCHEDULE)) return;

    const isConfirm = data === CALLBACK_KEYS.SCHEDULE.CONFIRM;
    const isCancel = data === CALLBACK_KEYS.SCHEDULE.CANCEL;

    const middleware = isConfirm
      ? previewConfirmationHandler
      : scheduleCallbackHandler;

    handler(bot, [withAdminAuth, middleware])(query);
  });

  bot.on("message", handler(bot, [scheduleMessageHandler]));
};
