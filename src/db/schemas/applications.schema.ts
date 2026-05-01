import { integer, pgTable, varchar, text, timestamp, unique, pgEnum, uuid } from "drizzle-orm/pg-core";
import { users } from "./user.schema";
import { missions } from "./missions.schema";

export const applyStatusEnum = pgEnum("apply_status", ["pending", "approved", "rejected"]);


// TABEL APPLICATIONS
export const applications = pgTable("applications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  volunteerId: uuid("volunteer_id").notNull().references(() => users.id),       // Ubah jadi uuid (refence key)
  missionId: integer("mission_id").notNull().references(() => missions.id),     // Pastikan ini integer (refence key)
  status: applyStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  unq: unique().on(t.volunteerId, t.missionId),
}));