import { db } from '../config/db'
import { applications, missions, users } from '../db/schemas'
import { eq, and, isNull } from 'drizzle-orm'
import pool from '../config/db'

// ================================================
// CAP-80: POST /api/apply - Create Apply
// ================================================
export const applyMission = async (data: {
  missionId: string
  volunteerId: string
  fullName: string
  birthDate: Date
  phoneNumber: string
  domicile: string
  skillsUrl: string
  skillsPublicId: string
  videoLink?: string
}) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Lock mission row for consistent quota check
    const missionResult = await client.query(
      `SELECT id, status, volunteers_needed, volunteers_applied, event_mode 
       FROM missions 
       WHERE id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [data.missionId]
    )

    if (missionResult.rows.length === 0) {
      throw { status: 404, error: 'MISSION_NOT_FOUND', message: 'Misi tidak ditemukan.' }
    }

    const mission = missionResult.rows[0]

    // Requirement: Mission must not be closed or finished
    const closedStatuses = ['selesai', 'relawan_terkumpul', 'sedang_berjalan']
    if (closedStatuses.includes(mission.status)) {
      throw { status: 409, error: 'MISSION_CLOSED', message: 'Misi ini sudah tidak menerima pendaftaran.' }
    }

    // Conditional Validation: video_link required if mission is online
    if (mission.event_mode === 'online' && !data.videoLink) {
      throw { 
        status: 422, 
        error: 'VALIDATION_ERROR', 
        message: 'Video link wajib diisi untuk misi online.' 
      }
    }

    // Check if volunteer already applied
    const existing = await client.query(
      `SELECT id, status FROM applications WHERE volunteer_id = $1 AND mission_id = $2`,
      [data.volunteerId, data.missionId]
    )

    if (existing.rows.length > 0) {
      const app = existing.rows[0];
      if (app.status !== 'cancelled') {
        throw { status: 409, error: 'ALREADY_APPLIED', message: 'Anda sudah mendaftar ke misi ini' }
      }
      // If previously cancelled, we allow re-applying by updating the record or creating a new one.
      await client.query(
        `UPDATE applications SET 
          status = 'pending', 
          full_name = $2,
          birth_date = $3,
          phone_number = $4,
          domicile = $5,
          skills_url = $6,
          skills_public_id = $7,
          video_link = $8,
          applied_at = NOW(), 
          updated_at = NOW() 
         WHERE id = $1`,
        [
          app.id, 
          data.fullName, 
          data.birthDate, 
          data.phoneNumber, 
          data.domicile, 
          data.skillsUrl, 
          data.skillsPublicId, 
          data.videoLink || null
        ]
      )
      await client.query('COMMIT')
      return { id: app.id, status: 'pending' }
    }

    // Insert new application
    const insertResult = await client.query(
      `INSERT INTO applications (
        mission_id, volunteer_id, status, 
        full_name, birth_date, phone_number, domicile, 
        skills_url, skills_public_id, video_link,
        applied_at, updated_at
      )
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id, status`,
      [
        data.missionId, 
        data.volunteerId, 
        data.fullName, 
        data.birthDate, 
        data.phoneNumber, 
        data.domicile, 
        data.skillsUrl, 
        data.skillsPublicId, 
        data.videoLink || null
      ]
    )

    await client.query('COMMIT')
    return insertResult.rows[0]

  } catch (error: any) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// ================================================
// CAP-80: GET /api/misi/:id/applicants
// ================================================
export const getApplicantsByMission = async (missionId: string, lembagaId: string) => {
  // Requirement: Only owner can access
  const [mission] = await db.select().from(missions).where(and(eq(missions.id, missionId), isNull(missions.deletedAt)))
  
  if (!mission) {
    throw { status: 404, error: 'MISSION_NOT_FOUND', message: 'Misi tidak ditemukan.' }
  }

  if (mission.lembagaId !== lembagaId) {
    throw { status: 403, error: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke misi ini.' }
  }

  const result = await pool.query(
    `SELECT 
      a.id as apply_id,
      u.id as user_id,
      COALESCE(a.full_name, u.name) as full_name,
      a.birth_date,
      a.phone_number,
      a.domicile,
      a.skills_url,
      a.video_link,
      a.status
    FROM applications a
    JOIN users u ON a.volunteer_id = u.id
    WHERE a.mission_id = $1 AND a.status != 'cancelled'
    ORDER BY a.applied_at DESC`,
    [missionId]
  )

  return result.rows
}

// ================================================
// CAP-80: PATCH /api/apply/:id/approve
// ================================================
export const approveApplication = async (applicationId: string, lembagaId: string) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Get application and related mission
    const appResult = await client.query(
      `SELECT a.id, a.status, a.mission_id, m.status as mission_status, m.lembaga_id, m.volunteers_needed, m.volunteers_applied
       FROM applications a
       JOIN missions m ON a.mission_id = m.id
       WHERE a.id = $1
       FOR UPDATE OF a`,
      [applicationId]
    )

    if (appResult.rows.length === 0) {
      throw { status: 404, error: 'NOT_FOUND', message: 'Data pendaftaran tidak ditemukan.' }
    }

    const app = appResult.rows[0]

    // Requirement: Only owner can approve
    if (app.lembaga_id !== lembagaId) {
      throw { status: 403, error: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke pendaftaran ini.' }
    }

    // Requirement: Status must be pending
    if (app.status !== 'pending') {
      throw { status: 400, error: 'INVALID_STATUS', message: `Tidak dapat menyetujui pendaftaran dengan status ${app.status}.` }
    }

    // Requirement: If the mission is already selesai, reject the approval
    if (app.mission_status === 'selesai') {
      throw { status: 400, error: 'Mission sudah selesai' }
    }

    // Requirement: Prevent double approval (handled by status check)
    // Quota logic: Check if still available
    if (app.volunteers_applied >= app.volunteers_needed) {
      throw { status: 400, error: 'Kuota relawan penuh' }
    }

    // Update status to approved
    // Trigger will handle volunteers_applied increment and mission status update
    await client.query(
      `UPDATE applications SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [applicationId]
    )

    await client.query('COMMIT')
    return true
  } catch (error: any) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// ================================================
// CAP-80: PATCH /api/apply/:id/reject
// ================================================
export const rejectApplication = async (applicationId: string, lembagaId: string, reason?: string) => {
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId))
  
  if (!app) {
    throw { status: 404, error: 'NOT_FOUND', message: 'Data pendaftaran tidak ditemukan.' }
  }

  const [mission] = await db.select().from(missions).where(eq(missions.id, app.missionId))
  
  if (mission.lembagaId !== lembagaId) {
    throw { status: 403, error: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke pendaftaran ini.' }
  }

  if (mission.status === 'selesai') {
    throw { status: 400, error: 'Mission sudah selesai' }
  }

  if (app.status !== 'pending') {
    throw { status: 400, error: 'INVALID_STATUS', message: 'Hanya pendaftaran pending yang dapat ditolak.' }
  }

  await db.update(applications)
    .set({ 
      status: 'rejected', 
      rejectedReason: reason,
      updatedAt: new Date() 
    })
    .where(eq(applications.id, applicationId))

  return true
}

// ================================================
// CAP-80: DELETE /api/apply/:id - Cancel Apply
// ================================================
export const cancelApplication = async (applicationId: string, volunteerId: string) => {
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId))

  if (!app) {
    throw { status: 404, error: 'NOT_FOUND', message: 'Data pendaftaran tidak ditemukan.' }
  }

  const [mission] = await db.select().from(missions).where(eq(missions.id, app.missionId))

  // Requirement: Only the volunteer who created can cancel
  if (app.volunteerId !== volunteerId) {
    throw { status: 403, error: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke pendaftaran ini.' }
  }

  if (mission.status === 'selesai') {
    throw { status: 400, error: 'Mission sudah selesai' }
  }

  // Requirement: Allowed only if status is pending
  if (app.status !== 'pending') {
    throw { status: 400, error: 'INVALID_STATUS', message: 'Pendaftaran sudah diproses, tidak dapat dibatalkan.' }
  }

  await db.update(applications)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(applications.id, applicationId))

  return true
}

// ================================================
// CAP-80: GET /api/apply/me
// ================================================
export const getMyApplications = async (volunteerId: string) => {
  const result = await pool.query(
    `SELECT 
      a.id as apply_id,
      a.mission_id as misi_id,
      m.title as judul,
      m.description as deskripsi,
      m.category as kategori,
      m.location as alamat,
      m.photos as foto,
      m.event_mode as mode,
      m.volunteers_needed as jumlah_relawan,
      m.start_date as tanggal_mulai,
      m.end_date as tanggal_selesai,
      m.contact_link as link_lokasi,
      m.coordinator_whatsapp as link_wa,
      m.latitude,
      m.longitude,
      m.status as mission_status,
      a.status as apply_status,
      a.applied_at
    FROM applications a
    JOIN missions m ON a.mission_id = m.id
    WHERE a.volunteer_id = $1
    ORDER BY a.applied_at DESC`,
    [volunteerId]
  )

  const statusMap: Record<string, string> = {
    "menunggu_relawan": "Open",
    "sedang_berjalan": "Ongoing",
    "relawan_terkumpul": "Full",
    "selesai": "Completed",
  };

  const applyStatusMap: Record<string, string> = {
    "pending": "Pending",
    "approved": "Approve",
    "rejected": "Reject",
    "cancelled": "Cancelled"
  };

  const reverseCategoryMap: Record<string, string> = {
    "tanggap_bencana": "Bencana Alam",
    "pendidikan": "Edukasi",
    "medis": "Kesehatan",
    "logistik": "Lingkungan", // Adjust mapping based on actual usage, mapping environment temporarily
  };

  return result.rows.map(r => ({
    id: r.apply_id,
    misi_id: r.misi_id,
    judul: r.judul,
    deskripsi: r.deskripsi,
    kategori: reverseCategoryMap[r.kategori] || r.kategori,
    alamat: r.alamat,
    foto: r.foto,
    mode: r.mode === 'online' ? 'Online' : 'Offline',
    jumlah_relawan: r.jumlah_relawan,
    tanggal_mulai: r.tanggal_mulai,
    tanggal_selesai: r.tanggal_selesai,
    link_lokasi: r.link_lokasi,
    link_wa: r.link_wa,
    latitude: r.latitude ? parseFloat(r.latitude) : null,
    longitude: r.longitude ? parseFloat(r.longitude) : null,
    status: statusMap[r.mission_status] || r.mission_status,
    apply_status: applyStatusMap[r.apply_status] || r.apply_status
  }));
}
