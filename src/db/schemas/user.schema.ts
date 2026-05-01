import { 
  pgTable, uuid, varchar, 
  boolean, timestamp, pgEnum 
} from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['volunteer', 'lembaga', 'super_admin']) // role
export const authProviderEnum = pgEnum('auth_provider', ['email', 'google'])   // auth

// INI TABEL USERS 
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: roleEnum('role').notNull(),                                                 //enum
  authProvider: authProviderEnum('auth_provider').notNull().default('email'),       // enum
  isProfileComplete: boolean('is_profile_complete').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert