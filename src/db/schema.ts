import { integer, pgTable, varchar, text, timestamp, unique, pgEnum, doublePrecision, boolean } from "drizzle-orm/pg-core";

export const applyStatusEnum = pgEnum("apply_status", ["pending", "approved", "rejected"]);

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  role: varchar({ length: 50 }).notNull().default("volunteer"),
  password: text().notNull(), 
});

export const missions = pgTable("missions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  // Kolom Baru untuk CAP-70
  category: varchar({ length: 100 }).notNull().default("Umum"),
  address: text().notNull().default("N/A"),
  latitude: doublePrecision().notNull().default(0.0),
  longitude: doublePrecision().notNull().default(0.0),
  isDeleted: boolean("is_deleted").default(false),
  
  // Kolom dari CAP-68 & CAP-69
  location: varchar({ length: 255 }).notNull().default("N/A"), 
  status: varchar({ length: 50 }).notNull().default("Open"),
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