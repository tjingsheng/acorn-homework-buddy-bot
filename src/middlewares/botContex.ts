import TelegramBot from "node-telegram-bot-api";

export type BotContext = {
  bot: TelegramBot;
  message: TelegramBot.Message;
  chatId: string;
};

export type Middleware = (
  ctx: BotContext,
  next: () => Promise<void>
) => Promise<void>;
