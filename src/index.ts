import TelegramBot from "node-telegram-bot-api";
import dotenv from "@dotenvx/dotenvx";
import { registerBotHandlers } from "./bot";

dotenv.config();

const token = process.env.TELEGRAM_TOKEN!;
const webhookSecret = process.env.WEBHOOK_TOKEN!;

const bot = new TelegramBot(token);
registerBotHandlers(bot);

export const handler = async (event: any) => {
  const method = event.requestContext?.http?.method;
  const headers = event.headers || {};

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
