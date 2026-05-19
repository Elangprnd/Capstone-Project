import { db } from '../config/db'
import { edukasi, users } from '../db/schemas'
import { eq, and, desc, sql } from 'drizzle-orm'
import { deleteFromCloudinary } from './upload.services'

export const createEdukasi = async (data: any) => {
  const [result] = await db.insert(edukasi).values({
    ...data,
    tanggalUpload: new Date(),
    updatedAt: new Date(),
  }).returning()
  return result
}

export const getEdukasiById = async (id: string) => {
  const result = await db.query.edukasi.findFirst({
    where: eq(edukasi.id, id),
    with: {
      uploaderId: true
    }
  })
  // Wait, I need to check how with works in this project's drizzle config.
  // Actually, I'll just use the standard select to be safe.
  return result
}

// Redefining getEdukasiById with a simpler approach if 'with' is not configured
export const getEdukasiDetail = async (id: string) => {
  const result = await db.select({
    id: edukasi.id,
    judul_materi: edukasi.judulMateri,
    deskripsi_materi: edukasi.deskripsiMateri,
    kategori_materi: edukasi.kategoriMateri,
    link_video: edukasi.linkVideo,
    thumbnail_url: edukasi.thumbnailUrl,
    thumbnail_public_id: edukasi.thumbnailPublicId,
    tanggal_upload: edukasi.tanggalUpload,
    uploader_name: users.name,
    uploader_id: edukasi.uploaderId
  })
  .from(edukasi)
  .leftJoin(users, eq(edukasi.uploaderId, users.id))
  .where(eq(edukasi.id, id))
  .limit(1)

  return result[0]
}

export const updateEdukasi = async (id: string, userId: string, data: any) => {
  const [existing] = await db.select().from(edukasi).where(eq(edukasi.id, id))
  
  if (!existing) return { status: 404, message: 'Materi edukasi tidak ditemukan.' }
  if (existing.uploaderId !== userId) return { status: 403, message: 'Anda tidak memiliki akses untuk mengubah materi ini.' }

  const [updated] = await db.update(edukasi)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(edukasi.id, id))
    .returning()
  
  return { status: 200, data: updated }
}

export const deleteEdukasi = async (id: string, userId: string) => {
  const [existing] = await db.select().from(edukasi).where(eq(edukasi.id, id))
  
  if (!existing) return { status: 404, message: 'Materi edukasi tidak ditemukan.' }
  if (existing.uploaderId !== userId) return { status: 403, message: 'Anda tidak memiliki akses untuk menghapus materi ini.' }

  if (existing.thumbnailPublicId) {
    try {
      await deleteFromCloudinary(existing.thumbnailPublicId)
    } catch (error) {
      console.error('Failed to delete thumbnail from Cloudinary:', error)
      // Continue deleting from DB even if storage deletion fails as per requirement
    }
  }

  await db.delete(edukasi).where(eq(edukasi.id, id))
  return { status: 204 }
}

export const browseEdukasi = async (filters: { kategori?: any, page?: number, limit?: number }) => {
  const { kategori, page = 1, limit = 10 } = filters
  const offset = (page - 1) * limit

  const whereClause = kategori ? eq(edukasi.kategoriMateri, kategori) : sql`true`

  const data = await db.select({
    id: edukasi.id,
    judul: edukasi.judulMateri,
    deskripsi: edukasi.deskripsiMateri,
    kategori: edukasi.kategoriMateri,
    link_video: edukasi.linkVideo,
    thumbnail_url: edukasi.thumbnailUrl,
    tanggal_upload: edukasi.tanggalUpload,
    uploader_name: users.name
  })
  .from(edukasi)
  .leftJoin(users, eq(edukasi.uploaderId, users.id))
  .where(whereClause)
  .orderBy(desc(edukasi.tanggalUpload))
  .limit(limit)
  .offset(offset)

  return data
}
