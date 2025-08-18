import TelegramBot from "node-telegram-bot-api";
import { handler } from "./middlewares/handler.ts";
import { withAdminAuth } from "./middlewares/withAdminAuth.ts";
import { testCommand } from "./commands/testCommand.ts";
import { authCommand } from "./commands/authCommand.ts";
import { startCommand } from "./commands/startCommand.ts";
import { scheduleCommand } from "./commands/scheduleCommand.ts";
import { hiCommand } from "./commands/hiCommand.ts";

export function registerBotHandlers(bot: TelegramBot) {
  bot.onText(/\/start/, handler(bot, [startCommand]));

  bot.onText(/^\/auth(?:\s+.+)?$/, handler(bot, [authCommand]));

  bot.onText(/\/test/, handler(bot, [withAdminAuth, testCommand]));

  bot.onText(/\/hi/, handler(bot, [hiCommand]));

  bot.onText(
    /^\/schedule(?:\s+.+)?$/,
    handler(bot, [withAdminAuth, scheduleCommand])
  );
}
