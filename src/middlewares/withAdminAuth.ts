import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { user } from "../db/schema.ts";
import { type Middleware } from "./botContex.ts";

export const withAdminAuth: Middleware = async (ctx, next) => {
  const { chatId, bot } = ctx;

  try {
    const [currentUser] = await db
      .select({ isAdmin: user.isAdmin })
      .from(user)
      .where(eq(user.chatId, chatId));

    if (!currentUser?.isAdmin) {
      await bot.sendMessage(
        chatId,
        "You are not authorised to use this command."
      );
      return;
    }

    await next();
  } catch (err) {
    console.error("Auth error:", err);
    await bot.sendMessage(chatId, "Authorisation failed due to an error.");
  }
};
