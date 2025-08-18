import TelegramBot from "node-telegram-bot-api";
import dotenv from "@dotenvx/dotenvx";
import { registerBotHandlers } from "./bot";
import { db } from "./db/index.ts";
import { scheduledMessage, user } from "./db/schema.ts";
import { and, eq, lte } from "drizzle-orm";

dotenv.config();

const token = process.env.TELEGRAM_TOKEN!;
const webhookSecret = process.env.WEBHOOK_TOKEN!;

const bot = new TelegramBot(token, { polling: false });

registerBotHandlers(bot);

export const handler = async (event: any) => {
  const method = event.requestContext?.http?.method;
  const path = event.rawPath || event.requestContext?.http?.path || "/";
  const headers = event.headers || {};

  if (method === "GET" && path === "/blast") {
    const now = new Date();

    const messages = await db
      .select()
      .from(scheduledMessage)
      .where(
        and(
          eq(scheduledMessage.sent, false),
          lte(scheduledMessage.scheduledAt, now)
        )
      );

    if (messages.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "no messages to send" }),
      };
    }

    const users = await db.select().from(user);

    for (const msg of messages) {
      for (const u of users) {
        try {
          await bot.sendMessage(u.chatId, msg.message);
        } catch (err) {
          console.error(`Failed to send to ${u.chatId}:`, err);
        }
      }

      await db
        .update(scheduledMessage)
        .set({ sent: true })
        .where(eq(scheduledMessage.id, msg.id));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sentMessages: messages.length }),
    };
  }

  if (method === "GET") {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "ok" }),
    };
  }

  if (method !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  const incomingSecret =
    headers["X-Telegram-Bot-Api-Secret-Token"] ||
    headers["x-telegram-bot-api-secret-token"];

  if (incomingSecret !== webhookSecret) {
    return {
      statusCode: 403,
      body: "Forbidden",
    };
  }

  const update =
    typeof event.body === "string" ? JSON.parse(event.body) : event.body;

  bot.processUpdate(update);

  return {
    statusCode: 200,
    body: "ok",
  };
};
