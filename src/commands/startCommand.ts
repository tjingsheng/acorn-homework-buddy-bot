import { db } from "../db/index.ts";
import { user } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";

export const startCommand: Middleware = async (ctx) => {
  const { bot, chatId, message } = ctx;

  try {
    await db
      .insert(user)
      .values({
        chatId: String(chatId),
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
  } catch (err) {
    console.error("Error creating user in /start:", err);
    await bot.sendMessage(
      chatId,
      "Something went wrong while registering you."
    );
  }
};
