import { db } from "../db/index.ts";
import { member } from "../db/schema.ts";
import { type Middleware } from "../middlewares/botContex.ts";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const authCommand: Middleware = async (ctx) => {
  const { bot, message, chatId } = ctx;

  const match = message.text?.match(/^\/auth(?:\s+(.+))?$/);
  const supplied = (match?.[1] ?? "").trim();

  if (!supplied) {
    await bot.sendMessage(chatId, "Usage: /auth <password>");
    return;
  }

  if (!ADMIN_PASSWORD) {
    await bot.sendMessage(
      chatId,
      "Server misconfigured: ADMIN_PASSWORD not set."
    );
    return;
  }

  if (supplied === ADMIN_PASSWORD) {
    await db
      .insert(member)
      .values({
        chatId: String(chatId),
        isAdmin: true,
      })
      .onConflictDoUpdate({
        target: member.chatId,
        set: { isAdmin: true },
      });

    await bot.sendMessage(chatId, "Logged in. You can now use admin commands.");
  } else {
    await bot.sendMessage(chatId, "Incorrect password.");
  }
};
