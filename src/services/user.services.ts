import { db } from "../config/db";
import { users } from "../db/schemas";
import { eq } from "drizzle-orm";

export const updateName = async (userId: string, newName: string) => {
  const [updated] = await db
    .update(users)
    .set({ 
      name: newName,
      updatedAt: new Date() 
    })
    .where(eq(users.id, userId))
    .returning();
  
  if (!updated) {
    throw new Error("USER_NOT_FOUND");
  }

  return updated;
};
