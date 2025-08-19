import type TelegramBot from "node-telegram-bot-api";
import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";
import { CALLBACK_KEYS } from "../callbackKeys.ts";
import { handler } from "../middlewares/handler.ts";
import { withAdminAuth } from "../middlewares/withAdminAuth.ts";
import { chunk, formatDateSingapore, monthNames } from "../utils/index.ts";

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
const pendingText = new Map<string, string>();
const cancelButton: TelegramBot.InlineKeyboardButton[] = [
  { text: "Cancel", callback_data: CALLBACK_KEYS.SCHEDULE.CANCEL },
];

export const scheduleCommand: Middleware = async (ctx) => {
  const { bot, chatId } = ctx;
  scheduleState.set(chatId, {});

  const currentYear = parseInt(
    new Date().toLocaleString("en-SG", {
      timeZone: "Asia/Singapore",
      year: "numeric",
    }),
    10
  );

  const years = [currentYear, currentYear + 1].map((year) => ({
    text: `${year}`,
    callback_data: CALLBACK_KEYS.SCHEDULE.YEAR(year),
  }));

  await bot.sendMessage(chatId, "Select a year:", {
    reply_markup: {
      inline_keyboard: [years, cancelButton],
    },
  });
};

export const scheduleCallbackHandler: Middleware = async (ctx) => {
  const { callbackQuery, bot, chatId } = ctx;
  if (!callbackQuery?.data) return;

  const data = callbackQuery.data;

  if (data === CALLBACK_KEYS.SCHEDULE.CANCEL) {
    scheduleState.delete(chatId);
    awaitingMessage.delete(chatId);
    pendingText.delete(chatId);

    await bot.sendMessage(chatId, "Scheduling cancelled.");
    await bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  if (data === CALLBACK_KEYS.SCHEDULE.CONFIRM) {
    const date = awaitingMessage.get(chatId);
    const text = pendingText.get(chatId);

    if (!date || !text) {
      await bot.sendMessage(
        chatId,
        "No pending message to confirm. Please try again."
      );
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }

    await db
      .insert(scheduledMessage)
      .values({ scheduledAt: date, message: text });

    awaitingMessage.delete(chatId);
    pendingText.delete(chatId);

    await bot.sendMessage(
      chatId,
      `Scheduled your message for ${formatDateSingapore(date)}`
    );
    await bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  if (!scheduleState.has(chatId)) scheduleState.set(chatId, {});
  const state = scheduleState.get(chatId)!;
  const [_, part, value] = data.split("_");

  switch (part) {
    case "year": {
      state.year = parseInt(value);
      const months = monthNames.map((name, i) => ({
        text: name,
        callback_data: CALLBACK_KEYS.SCHEDULE.MONTH(i + 1),
      }));
      await bot.sendMessage(chatId, "Select a month:", {
        reply_markup: { inline_keyboard: [...chunk(months, 3), cancelButton] },
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
      await bot.sendMessage(chatId, "Select a day:", {
        reply_markup: { inline_keyboard: [...chunk(days, 7), cancelButton] },
      });
      break;
    }

    case "day": {
      state.day = parseInt(value);
      const hours = Array.from({ length: 24 }, (_, i) => ({
        text: `${i}`.padStart(2, "0"),
        callback_data: CALLBACK_KEYS.SCHEDULE.HOUR(i),
      }));
      await bot.sendMessage(chatId, "Select an hour (24-hour clock):", {
        reply_markup: { inline_keyboard: [...chunk(hours, 6), cancelButton] },
      });
      break;
    }

    case "hour": {
      state.hour = parseInt(value);
      const minutes = [0, 15, 30, 45].map((m) => ({
        text: `${m}`.padStart(2, "0"),
        callback_data: CALLBACK_KEYS.SCHEDULE.MINUTE(m),
      }));
      await bot.sendMessage(chatId, "Select minutes:", {
        reply_markup: { inline_keyboard: [minutes, cancelButton] },
      });
      break;
    }

    case "minute": {
      state.minute = parseInt(value);
      const date = new Date(
        state.year!,
        state.month!,
        state.day!,
        state.hour!,
        state.minute!
      );
      awaitingMessage.set(chatId, date);
      scheduleState.delete(chatId);
      await bot.sendMessage(
        chatId,
        `Now send the message to schedule for:\n*${formatDateSingapore(date)}*`,
        { parse_mode: "MarkdownV2" }
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

  const text = message.text.trim();
  pendingText.set(chatId, text);

  await bot.sendMessage(
    chatId,
    `Please confirm scheduling on ${formatDateSingapore(
      scheduledAt
    )}\n\n${text}`,
    {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Confirm",
              callback_data: CALLBACK_KEYS.SCHEDULE.CONFIRM,
            },
          ],
          cancelButton,
        ],
      },
    }
  );
};

export const registerScheduleMessageFunctionality = (bot: TelegramBot) => {
  bot.onText(
    /^\/schedule_message(?:\s+.+)?$/,
    handler(bot, [withAdminAuth, scheduleCommand])
  );

  bot.on("callback_query", (query) => {
    const d = query.data;
    if (!d?.startsWith(CALLBACK_KEYS.PREFIX.SCHEDULE)) return;
    handler(bot, [withAdminAuth, scheduleCallbackHandler])(query);
  });

  bot.on("message", handler(bot, [scheduleMessageHandler]));
};
