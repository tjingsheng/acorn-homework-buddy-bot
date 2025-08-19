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
const pendingText = new Map<string, string>();
const cancelButton: TelegramBot.InlineKeyboardButton[] = [
  { text: "Cancel", callback_data: CALLBACK_KEYS.SCHEDULE.CANCEL },
];

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

const monthNames = [
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
];

export const scheduleCommand: Middleware = async (ctx) => {
  const { bot, chatId } = ctx;
  scheduleState.set(chatId, {});

  const currentYear = new Date().getUTCFullYear();
  const years = [currentYear, currentYear + 1].map((year) => ({
    text: `${year}`,
    callback_data: CALLBACK_KEYS.SCHEDULE.YEAR(year),
  }));

  await bot.sendMessage(chatId, "📅 Select a year:", {
    reply_markup: {
      inline_keyboard: [years, cancelButton],
    },
  });
};

export const scheduleCallbackHandler: Middleware = async (ctx) => {
  const { callbackQuery, bot, chatId } = ctx;
  if (!callbackQuery?.data) return;

  const data = callbackQuery.data;

  // Global cancel (works at any time)
  if (data === CALLBACK_KEYS.SCHEDULE.CANCEL) {
    scheduleState.delete(chatId);
    awaitingMessage.delete(chatId);
    pendingText.delete(chatId);

    await bot.sendMessage(chatId, "❌ Schedule cancelled.");
    await bot.answerCallbackQuery(callbackQuery.id);

    if (callbackQuery.message?.message_id) {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: callbackQuery.message.message_id }
      );
    }
    return;
  }

  // Final confirm (after user typed message)
  if (data === CALLBACK_KEYS.SCHEDULE.CONFIRM) {
    const date = awaitingMessage.get(chatId);
    const text = pendingText.get(chatId);

    if (!date || !text) {
      await bot.sendMessage(
        chatId,
        "⚠️ No pending message to confirm. Please try again."
      );
      await bot.answerCallbackQuery(callbackQuery.id);
      if (callbackQuery.message?.message_id) {
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: callbackQuery.message.message_id }
        );
      }
      return;
    }

    await db
      .insert(scheduledMessage)
      .values({ scheduledAt: date, message: text });

    // Clean up
    awaitingMessage.delete(chatId);
    pendingText.delete(chatId);

    await bot.sendMessage(
      chatId,
      `✅ Scheduled your message for ${date.toUTCString()}`
    );
    await bot.answerCallbackQuery(callbackQuery.id);

    if (callbackQuery.message?.message_id) {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: callbackQuery.message.message_id }
      );
    }
    return;
  }

  // Ignore if not schedule-related
  if (!data.startsWith(CALLBACK_KEYS.PREFIX.SCHEDULE)) return;

  if (!scheduleState.has(chatId)) scheduleState.set(chatId, {});
  const state = scheduleState.get(chatId)!;

  const [_, part, value] = data.split("_");

  const summary = () =>
    `🗓️ Selected: ${state.year ?? "-"} / ${
      typeof state.month === "number" ? monthNames[state.month] : "-"
    } / ${state.day ?? "-"} ${
      typeof state.hour === "number"
        ? `/ ${state.hour.toString().padStart(2, "0")}`
        : ""
    }${
      typeof state.minute === "number"
        ? `:${state.minute.toString().padStart(2, "0")}`
        : ""
    }`;

  switch (part) {
    case "year": {
      state.year = parseInt(value);
      const months = monthNames.map((name, i) => ({
        text: name,
        callback_data: CALLBACK_KEYS.SCHEDULE.MONTH(i + 1),
      }));
      await bot.sendMessage(chatId, `${summary()}\n📅 Select a month:`, {
        reply_markup: {
          inline_keyboard: [...chunk(months, 3), cancelButton],
        },
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

      await bot.sendMessage(chatId, `${summary()}\n📅 Select a day:`, {
        reply_markup: {
          inline_keyboard: [...chunk(days, 7), cancelButton],
        },
      });
      break;
    }

    case "day": {
      state.day = parseInt(value);

      const hours = Array.from({ length: 24 }, (_, i) => ({
        text: `${i}`.padStart(2, "0"),
        callback_data: CALLBACK_KEYS.SCHEDULE.HOUR(i),
      }));

      await bot.sendMessage(chatId, `${summary()}\n🕒 Select an hour (UTC):`, {
        reply_markup: {
          inline_keyboard: [...chunk(hours, 6), cancelButton],
        },
      });
      break;
    }

    case "hour": {
      state.hour = parseInt(value);

      const minutes = [0, 15, 30, 45].map((m) => ({
        text: `${m}`.padStart(2, "0"),
        callback_data: CALLBACK_KEYS.SCHEDULE.MINUTE(m),
      }));

      await bot.sendMessage(chatId, `${summary()}\n🕓 Select minutes:`, {
        reply_markup: {
          inline_keyboard: [minutes, cancelButton],
        },
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

      // Store only date here; message comes next
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

  // Acknowledge and clear old keyboard (prevents tapping old buttons)
  await bot.answerCallbackQuery(callbackQuery.id);
  if (callbackQuery.message?.message_id) {
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: callbackQuery.message.message_id }
    );
  }
};

export const scheduleMessageHandler: Middleware = async (ctx) => {
  const { bot, message, chatId } = ctx;
  if (!message?.text?.trim()) return;

  const scheduledAt = awaitingMessage.get(chatId);
  if (!scheduledAt) return; // Only collect text if time already chosen

  // Save pending text for final confirmation
  const text = message.text.trim();
  pendingText.set(chatId, text);

  await bot.sendMessage(
    chatId,
    `📋 Please confirm scheduling:\n\n🕒 *${scheduledAt.toUTCString()}*\n💬 *${text}*`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Confirm",
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
    const isSchedule =
      d?.startsWith(CALLBACK_KEYS.PREFIX.SCHEDULE) ||
      d === CALLBACK_KEYS.SCHEDULE.CONFIRM ||
      d === CALLBACK_KEYS.SCHEDULE.CANCEL;

    if (!isSchedule) return;
    handler(bot, [withAdminAuth, scheduleCallbackHandler])(query);
  });

  bot.on("message", handler(bot, [scheduleMessageHandler]));
};
