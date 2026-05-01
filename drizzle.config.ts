import "dotenv/config";
import { defineConfig } from "drizzle-kit";

declare const process: { env: { DATABASE_URL?: string } };

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schemas/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
