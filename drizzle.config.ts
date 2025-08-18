import { defineConfig } from "drizzle-kit";
import dotenv from "@dotenvx/dotenvx";

dotenv.config();

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
