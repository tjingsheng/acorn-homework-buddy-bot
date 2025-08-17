import TelegramBot from "node-telegram-bot-api";
import { registerBotHandlers } from "./bot.ts";
import dotenv from "@dotenvx/dotenvx";

dotenv.config();

const token = process.env.TELEGRAM_TOKEN!;
const bot = new TelegramBot(token, { polling: true });

registerBotHandlers(bot);

console.log("Bot is running locally with polling");
