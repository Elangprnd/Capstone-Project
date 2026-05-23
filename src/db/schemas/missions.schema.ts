import { 
  pgTable, uuid, varchar, text, integer, 
  timestamp, pgEnum, decimal
} from 'drizzle-orm/pg-core'
import { users } from './user.schema'



// Status misi mengikuti state machine yang sudah didefinisikan di PRD
export const missionStatusEnum = pgEnum('mission_status', [
  'menunggu_relawan',   // Baru dibuat, masih terima pendaftar
  'sedang_berjalan',    // Sedang berlangsung
  'relawan_terkumpul',  // Kuota penuh, tidak terima pendaftar baru
  'selesai',            // Sudah selesai
])

export const missionCategoryEnum = pgEnum('mission_category', [
  'pendidikan',
  'tanggap_bencana',
  'medis',
  'logistik',
  'psikososial',
  'edukasi_online',
])

export const eventModeEnum = pgEnum('event_mode', ['offline', 'online'])

export const missions = pgTable('missions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Relasi ke user yang buat misi (role = lembaga)
  lembagaId: uuid('lembaga_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: missionCategoryEnum('category').notNull(),
  
  // Lokasi
  eventMode: eventModeEnum('event_mode').notNull().default('offline'),
  location: text('location').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  contactLink: varchar('contact_link', { length: 255 }),
  
  // Kuota relawan
  // volunteers_needed = total yang dibutuhkan
  // volunteers_applied = denormalized count, dijaga sync via DB trigger
  volunteersNeeded: integer('volunteers_needed').notNull().default(1),
  volunteersApplied: integer('volunteers_applied').notNull().default(0),
  
  // Kontak koordinator lapangan
  // Hanya visible ke relawan yang sudah approved
  coordinatorWhatsapp: varchar('coordinator_whatsapp', { length: 255 }),
  
  status: missionStatusEnum('status').notNull().default('menunggu_relawan'),
  
  // Foto kondisi lapangan (array URL)
  photos: text('photos').array(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export type Mission = typeof missions.$inferSelect
export type NewMission = typeof missions.$inferInsert