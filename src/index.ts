import TelegramBot from "node-telegram-bot-api";

import dotenv from "@dotenvx/dotenvx";
import { registerBotHandlers } from "./bot";

dotenv.config();

const token = process.env.TELEGRAM_TOKEN!;
const bot = new TelegramBot(token);
registerBotHandlers(bot);

export const handler = async (event: any) => {
  if (event.requestContext?.http?.method !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const update =
    typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  bot.processUpdate(update);

  return { statusCode: 200, body: "ok" };
};
