import { 
  pgTable, uuid, varchar, text, 
  timestamp, pgEnum 
} from 'drizzle-orm/pg-core'
import { users } from './user.schema'

export const kategoriEdukasiEnum = pgEnum('kategori_edukasi', [
  'Pendidikan',
  'Kesehatan',
  'Kesiapsiagaan Bencana'
])

export const edukasi = pgTable('edukasi', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploaderId: uuid('uploader_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  judulMateri: varchar('judul_materi', { length: 255 }).notNull(),
  deskripsiMateri: text('deskripsi_materi').notNull(),
  kategoriMateri: kategoriEdukasiEnum('kategori_materi').notNull(),
  linkVideo: varchar('link_video', { length: 255 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 255 }),
  thumbnailPublicId: varchar('thumbnail_public_id', { length: 255 }),
  tanggalUpload: timestamp('tanggal_upload').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Edukasi = typeof edukasi.$inferSelect
export type NewEdukasi = typeof edukasi.$inferInsert
