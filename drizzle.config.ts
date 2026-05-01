import type { Config } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config()

export default {
  schema: './src/db/schemas/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config