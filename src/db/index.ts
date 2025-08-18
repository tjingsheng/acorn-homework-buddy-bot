import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "@dotenvx/dotenvx";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

export const db = drizzle(databaseUrl);
