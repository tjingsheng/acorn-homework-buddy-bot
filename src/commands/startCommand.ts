import { db } from "../db/index.ts";
import { user } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";

export const startCommand: Middleware = async (ctx) => {
  const { bot, chatId, message } = ctx;

  if (!message.from) return;

  await db
    .insert(user)
    .values({
      chatId,
      isAdmin: false,
      firstName: message.from.first_name,
      lastName: message.from.last_name,
      userName: message.from.username,
    })
    .onConflictDoUpdate({
      target: user.chatId,
      set: { isAdmin: false },
    });

  await bot.sendMessage(
    chatId,
    "👋 Hello! You’ve been registered with the bot."
  );
};
