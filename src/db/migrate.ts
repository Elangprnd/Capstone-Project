import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// Fungsi utama yang menjalankan migrasi
const runMigration = async () => {
  console.log('Menghubungkan ke database...')

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const db = drizzle(pool)

  console.log('Menjalankan migrasi...')

  // Drizzle akan membaca semua file SQL di folder ./migrations
  // dan menjalankannya ke database secara berurutan
  await migrate(db, { 
    migrationsFolder: './migrations' 
  })

  console.log('✅ Migrasi berhasil!')

  // Tutup koneksi setelah selesai
  await pool.end()
  process.exit(0)
}

// Jalankan dan tangkap error jika ada
runMigration().catch((error) => {
  console.error('❌ Migrasi gagal:', error)
  process.exit(1)
})