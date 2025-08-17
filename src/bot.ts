import TelegramBot from "node-telegram-bot-api";

export function registerBotHandlers(bot: TelegramBot) {
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Hello from /start command 2");
  });
}
