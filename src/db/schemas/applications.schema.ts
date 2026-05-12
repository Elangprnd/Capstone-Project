import { 
  pgTable, uuid, varchar, timestamp, pgEnum, unique
} from 'drizzle-orm/pg-core'
import { users } from './user.schema'
import { missions } from './missions.schema'

export const applicationStatusEnum = pgEnum('application_status', [
  'pending',    // Baru apply, menunggu persetujuan
  'approved',   // Disetujui lembaga
  'rejected',   // Ditolak lembaga
])

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  missionId: uuid('mission_id')
    .notNull()
    .references(() => missions.id, { onDelete: 'set null' }),
    // set null bukan cascade, karena kalau misi dihapus
    // history apply relawan tetap ada (sesuai PRD CAP-68)
  
  volunteerId: uuid('volunteer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  status: applicationStatusEnum('status').notNull().default('pending'),
  
  appliedAt: timestamp('applied_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // UNIQUE CONSTRAINT: satu relawan hanya bisa apply satu kali per misi
  // Ini adalah safety net di level DB jika Guard 5 terlewati (race condition)
  uniqueApplication: unique().on(table.volunteerId, table.missionId),
}))

export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert