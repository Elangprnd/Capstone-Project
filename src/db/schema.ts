import { integer, pgTable, varchar, text, timestamp, unique, pgEnum } from "drizzle-orm/pg-core";

export const applyStatusEnum = pgEnum("apply_status", ["pending", "approved", "rejected"]);

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
  location: varchar({ length: 255 }).notNull().default("Remote"), 
  status: varchar({ length: 50 }).notNull().default("menunggu_relawan"),
  volunteersNeeded: integer("volunteers_needed").notNull().default(0),
  volunteersApplied: integer("volunteers_applied").notNull().default(0),
  coordinatorWhatsapp: varchar("coordinator_whatsapp", { length: 20 }), 
  createdAt: timestamp("created_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  volunteerId: integer("volunteer_id").notNull(),
  missionId: integer("mission_id").notNull(),
  status: applyStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  unq: unique().on(t.volunteerId, t.missionId),
}));