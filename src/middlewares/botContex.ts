import TelegramBot from "node-telegram-bot-api";

export type BotContext = {
  bot: TelegramBot;
  chatId: string;
  message?: TelegramBot.Message;
  callbackQuery?: TelegramBot.CallbackQuery;
};

export type Middleware = (
  ctx: BotContext,
  next: () => Promise<void>
) => Promise<void>;
