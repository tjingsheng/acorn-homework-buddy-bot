import { type Middleware } from "../middlewares/botContex.ts";

export const startCommand: Middleware = async (ctx) => {
  await ctx.bot.sendMessage(ctx.chatId, "Hello from /start command");
};
