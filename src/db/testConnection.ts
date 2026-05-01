import pool from '../config/db'

const testConnection = async () => {
  try {
    console.log('⏳ Testing koneksi database...')
    
    // Coba query sederhana
    const result = await pool.query('SELECT NOW() as current_time')
    console.log('✅ Database terhubung!')
    console.log('🕐 Waktu server DB:', result.rows[0].current_time)
    
    // Cek apakah tabel users sudah ada
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    console.log('📋 Tabel yang ada di database:')
    tableCheck.rows.forEach(row => console.log('  -', row.table_name))
    
    await pool.end()
  } catch (error) {
    console.error('❌ Koneksi database gagal:', error)
    process.exit(1)
  }
}

testConnection()