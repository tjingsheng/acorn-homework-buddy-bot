import { db } from "../db/index.ts";
import { member } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";

export const startCommand: Middleware = async (ctx) => {
  const { bot, chatId } = ctx;

  try {
    await db
      .insert(member)
      .values({
        chatId: String(chatId),
        isAdmin: false,
      })
      .onConflictDoUpdate({
        target: member.chatId,
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
