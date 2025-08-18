import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";

export const testCommand: Middleware = async (ctx) => {
  const result = await db.select().from(scheduledMessage);
  await ctx.bot.sendMessage(
    ctx.chatId,
    `DB Test: ${JSON.stringify(result)} scheduled messages.`
  );
};
