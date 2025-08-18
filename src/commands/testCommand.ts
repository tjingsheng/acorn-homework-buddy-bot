import { db } from "../db/index.ts";
import { scheduledMessage } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";

const generateId = () => Math.random().toString(36).substring(2, 8);

export const testCommand: Middleware = async (ctx) => {
  const requestId = generateId();
  const log = (...args: any[]) =>
    console.log(`[testCommand:${requestId}]`, ...args);

  const start = Date.now();
  let result;

  try {
    result = await db.select().from(scheduledMessage);
    log(`DB query successful.`);
  } catch (err) {
    log("DB error:", err);
    await ctx.bot.sendMessage(ctx.chatId, `DB query failed. ${err}`);
    return;
  }

  const duration = Date.now() - start;

  log("Sending message to Telegram...");
  await ctx.bot.sendMessage(
    ctx.chatId,
    `DB Test: Found ${result.length} scheduled messages.\n⏱ Took ${duration}ms.`
  );
  log("Message sent to Telegram.");
};
