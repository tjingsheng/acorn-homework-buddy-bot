import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";

export const testCommand: Middleware = async (ctx) => {
  const result = await db.select().from(scheduledMessage);
  ctx.bot.sendMessage(
    ctx.chatId,
    `DB Test: Found ${result.length} scheduled messages.\n `
  );
};
