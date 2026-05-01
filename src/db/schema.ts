import { integer, pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

export const missions = pgTable("missions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  status: varchar({ length: 50 }).notNull().default("menunggu_relawan"),
  
  volunteersNeeded: integer("volunteers_needed").notNull().default(0),
  volunteersApplied: integer("volunteers_applied").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});