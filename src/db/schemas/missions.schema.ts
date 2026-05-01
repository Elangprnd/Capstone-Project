import { integer, pgTable, varchar, text, timestamp, unique, pgEnum } from "drizzle-orm/pg-core";


// TABEL MISI
export const missions = pgTable("missions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  location: varchar({ length: 255 }).notNull().default("Remote"), 
  status: varchar({ length: 50 }).notNull().default("menunggu_relawan"),
  volunteersNeeded: integer("volunteers_needed").notNull().default(0),
  volunteersApplied: integer("volunteers_applied").notNull().default(0),
  coordinatorWhatsapp: varchar("coordinator_whatsapp", { length: 20 }), 
  createdAt: timestamp("created_at").defaultNow(),
});