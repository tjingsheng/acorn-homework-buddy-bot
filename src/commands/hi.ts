import { type Middleware } from "../middlewares/botContex.ts";
import type TelegramBot from "node-telegram-bot-api";
import { handler } from "../middlewares/handler.ts";

export const hiCommand: Middleware = async (ctx) => {
  await ctx.bot.sendMessage(ctx.chatId, "hi");
};

export const registerHiFunctionality = (bot: TelegramBot) => {
  bot.onText(/\/hi/, handler(bot, [hiCommand]));
};
