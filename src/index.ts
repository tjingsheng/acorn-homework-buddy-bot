import TelegramBot from "node-telegram-bot-api";
import dotenv from "@dotenvx/dotenvx";
import { handler } from "./middlewares/handler.ts";
import {
  registerStartInteractions,
  startCommand,
} from "./commands/startCommand.ts";
import { testCommand } from "./commands/testCommand.ts";
import { withAdminAuth } from "./middlewares/withAdminAuth.ts";
import { hiCommand } from "./commands/hiCommand.ts";
import {
  scheduleCommand,
  registerScheduleInteractions,
} from "./commands/scheduleCommand.ts";

dotenv.config();

const token = process.env.TELEGRAM_TOKEN!;
const bot = new TelegramBot(token, { polling: true });

await bot.setMyCommands([
  { command: "start", description: "Start and register with the bot" },
]);

bot.onText(/\/test/, handler(bot, [withAdminAuth, testCommand]));

bot.onText(/\/hi/, handler(bot, [hiCommand]));

bot.onText(/\/start/, handler(bot, [startCommand]));
registerStartInteractions(bot);

bot.onText(
  /^\/schedule(?:\s+.+)?$/,
  handler(bot, [withAdminAuth, scheduleCommand])
);
registerScheduleInteractions(bot);

console.log("Bot is running locally with polling");
