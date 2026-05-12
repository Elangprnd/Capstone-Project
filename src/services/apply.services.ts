import { db } from '../config/db'
import { applications, missions } from '../db/schemas'
import { eq, and } from 'drizzle-orm'
import pool from '../config/db'

// ================================================
// CAP-63: HAPPY PATH - Apply Misi
// ================================================
export const applyMission = async (data: {
  missionId: string
  volunteerId: string
}) => {

  // Kita pakai raw SQL pool untuk SELECT FOR UPDATE
  // karena Drizzle ORM belum support FOR UPDATE secara native
  const client = await pool.connect()

  try {
    // Mulai transaction
    await client.query('BEGIN')

    // ================================================
    // GUARD 2: Cek apakah misi ada
    // Menggunakan SELECT FOR UPDATE untuk lock baris misi
    // Ini mencegah race condition (CAP-69)
    // FOR UPDATE = "kunci baris ini sampai transaction selesai"
    // Jika ada request lain yang juga FOR UPDATE baris yang sama,
    // dia akan MENUNGGU sampai transaction ini commit/rollback
    // ================================================
    const missionResult = await client.query(
      `SELECT id, status, volunteers_needed, volunteers_applied, title
       FROM missions 
       WHERE id = $1
       FOR UPDATE`,  // ← Kunci baris ini!
      [data.missionId]
    )

    // Misi tidak ditemukan
    if (missionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      throw { 
        status: 404, 
        error: 'MISSION_NOT_FOUND',
        message: 'Misi tidak ditemukan.' 
      }
    }

    const mission = missionResult.rows[0]

    // ================================================
    // GUARD 3: Cek status misi
    // Hanya misi dengan status ini yang bisa menerima pendaftar
    // ================================================
    const acceptingStatuses = ['menunggu_relawan', 'sedang_berjalan']
    if (!acceptingStatuses.includes(mission.status)) {
      await client.query('ROLLBACK')
      throw { 
        status: 409, 
        error: 'MISSION_CLOSED',
        message: 'Misi ini sudah tidak menerima pendaftaran.' 
      }
    }

    // ================================================
    // GUARD 4: Cek kuota
    // Cek SETELAH lock baris, jadi angkanya pasti akurat
    // Ini menangkap edge case eventual consistency (CAP-66)
    // ================================================
    if (mission.volunteers_applied >= mission.volunteers_needed) {
      await client.query('ROLLBACK')
      throw { 
        status: 409, 
        error: 'QUOTA_FULL',
        message: 'Kuota relawan untuk misi ini sudah terpenuhi.' 
      }
    }

    // ================================================
    // GUARD 5: Cek duplikat apply (CAP-67)
    // ================================================
    const existingApplication = await client.query(
      `SELECT id, status FROM applications 
       WHERE volunteer_id = $1 AND mission_id = $2`,
      [data.volunteerId, data.missionId]
    )

    if (existingApplication.rows.length > 0) {
      await client.query('ROLLBACK')
      throw { 
        status: 409, 
        error: 'ALREADY_APPLIED',
        // Sertakan status existing agar frontend bisa tampilkan pesan kontekstual
        existingStatus: existingApplication.rows[0].status,
        message: 'Anda sudah mendaftar misi ini.' 
      }
    }

    // ================================================
    // SEMUA GUARD LOLOS - INSERT application
    // volunteers_applied akan otomatis increment via DB trigger
    // ================================================
    const insertResult = await client.query(
      `INSERT INTO applications (mission_id, volunteer_id, status, applied_at)
       VALUES ($1, $2, 'pending', NOW())
       RETURNING id, mission_id, status, applied_at`,
      [data.missionId, data.volunteerId]
    )

    // Commit transaction
    await client.query('COMMIT')

    return insertResult.rows[0]

  } catch (error: any) {
    // Rollback jika ada error yang tidak terduga
    await client.query('ROLLBACK')

    // Handle DB unique constraint violation (safety net CAP-67)
    // Error code 23505 = unique_violation di PostgreSQL
    if (error.code === '23505') {
      throw {
        status: 409,
        error: 'ALREADY_APPLIED',
        existingStatus: 'pending',
        message: 'Anda sudah mendaftar misi ini.',
      }
    }

    // Handle DB check constraint violation (safety net CAP-69)
    // Error code 23514 = check_violation di PostgreSQL
    if (error.code === '23514') {
      throw {
        status: 409,
        error: 'QUOTA_FULL',
        message: 'Kuota relawan untuk misi ini sudah terpenuhi.',
      }
    }

    // Re-throw error yang sudah kita definisikan (dari guards di atas)
    throw error

  } finally {
    // Selalu lepaskan koneksi ke pool
    client.release()
  }
}

// ================================================
// CAP-68: GET My Applications (Dashboard Relawan)
// ================================================
export const getMyApplications = async (volunteerId: string) => {

  // JOIN applications dengan missions untuk ambil detail misi
  // LEFT JOIN karena misi mungkin sudah dihapus (soft scenario CAP-68)
  const result = await pool.query(
    `SELECT 
      a.id as application_id,
      a.mission_id,
      a.status as application_status,
      a.applied_at,
      
      -- Kalau misi dihapus, tampilkan placeholder
      COALESCE(m.title, '[Misi dihapus]') as mission_title,
      COALESCE(m.address, '-') as mission_location,
      COALESCE(m.status::text, 'removed') as mission_status,
      
      -- coordinator_whatsapp HANYA muncul kalau status = approved
      -- Kalau pending/rejected, return null (Data Isolation CAP-68)
      CASE 
        WHEN a.status = 'approved' THEN m.coordinator_whatsapp
        ELSE NULL
      END as coordinator_whatsapp
      
    FROM applications a
    LEFT JOIN missions m ON a.mission_id = m.id
    
    -- DATA ISOLATION: hanya return data milik volunteer ini
    WHERE a.volunteer_id = $1
    
    ORDER BY a.applied_at DESC`,
    [volunteerId]
  )

  return result.rows
}