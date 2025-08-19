import TelegramBot from "node-telegram-bot-api";
import dotenv from "@dotenvx/dotenvx";
import { registerStartFunctionality } from "./commands/start.ts";
import { registerTestFunctionality, testCommand } from "./commands/test.ts";
import { registerHiFunctionality } from "./commands/hi.ts";
import { registerScheduleFunctionality } from "./commands/schedule.ts";

dotenv.config();

const token = process.env.TELEGRAM_TOKEN!;
const bot = new TelegramBot(token, { polling: true });

await bot.setMyCommands([
  { command: "start", description: "Start and register with the bot" },
  { command: "schedule", description: "Schedule a message using buttons" },
]);

registerHiFunctionality(bot);

registerScheduleFunctionality(bot);

registerStartFunctionality(bot);

registerTestFunctionality(bot);

console.log("Bot is running locally with polling");
