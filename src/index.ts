import app from "./app";
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { usersTable } from "./db/schema";

async function testConnection() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const db = drizzle(pool);

   
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM users;`);
    console.log(" Users table row count: ", result.rows[0].count);

    await pool.end();
    return true;
  } catch (error) {
    console.error("test failed:", error);
    return false;
  }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)});
