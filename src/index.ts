import TelegramBot from "node-telegram-bot-api";
import dotenv from "@dotenvx/dotenvx";
import { registerStartFunctionality } from "./commands/start.ts";
import { registerTestFunctionality, testCommand } from "./commands/test.ts";
import { registerHiFunctionality } from "./commands/hi.ts";
import { registerScheduleMessageFunctionality } from "./commands/schedule_message.ts";
import { registerManageMessagesFunctionality } from "./commands/manage_messages.ts";

dotenv.config();

const token = process.env.TELEGRAM_TOKEN!;
const bot = new TelegramBot(token, { polling: true });

await bot.setMyCommands([
  {
    command: "start",
    description: "Start the bot and register yourself",
  },
  {
    command: "schedule_message",
    description: "Schedule a message to be sent later",
  },
  {
    command: "manage_messages",
    description: "View and delete scheduled messages",
  },
]);
registerHiFunctionality(bot);

registerScheduleMessageFunctionality(bot);

registerStartFunctionality(bot);

registerTestFunctionality(bot);

registerManageMessagesFunctionality(bot);

console.log("Bot is running locally with polling");
