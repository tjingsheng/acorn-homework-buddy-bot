import TelegramBot from "node-telegram-bot-api";
import dotenv from "@dotenvx/dotenvx";

dotenv.config();

const token = process.env.TELEGRAM_TOKEN as string;
if (!token) {
  throw new Error("⚠️ TELEGRAM_TOKEN is missing in .env file");
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "👋 Hello, world! I am alive 🚀");
});
