import TelegramBot from "node-telegram-bot-api";
import { member, scheduledMessage } from "./db/schema.ts";
import { db } from "./db/index.ts";
import { eq } from "drizzle-orm";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function withAdminAuth(
  bot: TelegramBot,
  handler: (msg: TelegramBot.Message) => Promise<void>
) {
  return async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;

    try {
      const [currentMember] = await db
        .select({ isAdmin: member.isAdmin })
        .from(member)
        .where(eq(member.chatId, String(chatId)));

      if (!currentMember?.isAdmin) {
        await bot.sendMessage(
          chatId,
          "You are not authorised to use this command."
        );
        return;
      }

      await handler(msg);
    } catch (err) {
      console.error("Auth error:", err);
      await bot.sendMessage(chatId, "Authorisation failed due to an error.");
    }
  };
}

export function registerBotHandlers(bot: TelegramBot) {
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Hello from /start command");
  });

  bot.onText(/^\/auth(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
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
          chatId: String(msg.chat.id),
          isAdmin: true,
        })
        .onConflictDoUpdate({
          target: member.chatId,
          set: { isAdmin: true },
        });

      await bot.sendMessage(
        chatId,
        "Logged in. You can now use admin commands."
      );
    } else {
      await bot.sendMessage(chatId, "Incorrect password.");
    }
  });

  bot.onText(
    /\/test/,
    withAdminAuth(bot, async (msg) => {
      const chatId = msg.chat.id;

      const result = await db.select().from(scheduledMessage);

      await bot.sendMessage(
        chatId,
        `DB Test: ${JSON.stringify(result)} scheduled messages.`
      );
    })
  );
}
