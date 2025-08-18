import { type Middleware } from "../middlewares/botContex.ts";

export const hiCommand: Middleware = async (ctx) => {
  await ctx.bot.sendMessage(ctx.chatId, "hi");
};
