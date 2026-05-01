import { integer, pgTable, varchar, text, timestamp, unique, pgEnum } from "drizzle-orm/pg-core";

export const applyStatusEnum = pgEnum("apply_status", ["pending", "approved", "rejected"]);


// TABEL APPLICATIONS
export const applications = pgTable("applications", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  volunteerId: integer("volunteer_id").notNull(),
  missionId: integer("mission_id").notNull(),
  status: applyStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  unq: unique().on(t.volunteerId, t.missionId),
}));