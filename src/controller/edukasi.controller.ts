import { Request, Response } from 'express'
import { z } from 'zod'
import * as edukasiService from '../services/edukasi.services'
import { uploadToCloudinary, deleteFromCloudinary } from '../services/upload.services'

const ALLOWED_DOMAINS = ['youtube.com', 'youtu.be', 'drive.google.com']

const validateVideoLink = (url: string) => {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return ALLOWED_DOMAINS.includes(domain)
  } catch {
    return false
  }
}

const createEdukasiSchema = z.object({
  judul_materi: z.string().min(1, 'Judul materi wajib diisi'),
  deskripsi_materi: z.string().min(1, 'Deskripsi materi wajib diisi'),
  kategori_materi: z.enum(['Pendidikan', 'Kesehatan', 'Kesiapsiagaan Bencana']),
  link_video: z.string().url('Link video harus berupa URL valid').refine(validateVideoLink, {
    message: 'Link harus dari YouTube atau Google Drive.'
  })
})

const updateEdukasiSchema = createEdukasiSchema.partial()

export const createEdukasiHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createEdukasiSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: 'Validasi gagal',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    let thumbnailUrl = null
    let thumbnailPublicId = null

    if (req.file) {
      if (req.file.size > 5 * 1024 * 1024) {
        res.status(413).json({ success: false, message: 'Ukuran file thumbnail melebihi 5MB.' })
        return
      }
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'edukasi/thumbnails')
      thumbnailUrl = uploadResult.secure_url
      thumbnailPublicId = uploadResult.public_id
    }

    const userId = (req.user as any).user_id

    const result = await edukasiService.createEdukasi({
      judulMateri: parsed.data.judul_materi,
      deskripsiMateri: parsed.data.deskripsi_materi,
      kategoriMateri: parsed.data.kategori_materi,
      linkVideo: parsed.data.link_video,
      thumbnailUrl,
      thumbnailPublicId,
      uploaderId: userId,
    })

    res.status(201).json({
      success: true,
      message: 'Materi edukasi berhasil diunggah.',
      data: { id: result.id },
    })
  } catch (error: any) {
    console.error('Create edukasi error:', error)
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' })
  }
}

export const updateEdukasiHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const userId = (req.user as any).user_id

    const parsed = updateEdukasiSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: 'Validasi gagal',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    const updateData: any = {}
    if (parsed.data.judul_materi) updateData.judulMateri = parsed.data.judul_materi
    if (parsed.data.deskripsi_materi) updateData.deskripsiMateri = parsed.data.deskripsi_materi
    if (parsed.data.kategori_materi) updateData.kategoriMateri = parsed.data.kategori_materi
    if (parsed.data.link_video) updateData.linkVideo = parsed.data.link_video

    if (req.file) {
      if (req.file.size > 5 * 1024 * 1024) {
        res.status(413).json({ success: false, message: 'Ukuran file thumbnail melebihi 5MB.' })
        return
      }
      
      // Get existing to delete old thumbnail
      const existing = await edukasiService.getEdukasiDetail(id)
      if (existing && existing.uploader_id === userId && existing.thumbnail_public_id) {
         await deleteFromCloudinary(existing.thumbnail_public_id).catch(err => console.error('Delete old thumbnail failed:', err))
      }

      const uploadResult = await uploadToCloudinary(req.file.buffer, 'edukasi/thumbnails')
      updateData.thumbnailUrl = uploadResult.secure_url
      updateData.thumbnailPublicId = uploadResult.public_id
    }

    const result = await edukasiService.updateEdukasi(id, userId, updateData)

    if (result.status !== 200) {
      res.status(result.status).json({ success: false, message: result.message })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Materi edukasi berhasil diperbarui.',
    })
  } catch (error: any) {
    console.error('Update edukasi error:', error)
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' })
  }
}

export const deleteEdukasiHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const userId = (req.user as any).user_id

    const result = await edukasiService.deleteEdukasi(id, userId)

    if (result.status !== 204) {
      res.status(result.status).json({ success: false, message: result.message })
      return
    }

    res.status(204).send()
  } catch (error: any) {
    console.error('Delete edukasi error:', error)
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' })
  }
}

export const browseEdukasiHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kategori, page, limit } = req.query

    const filters = {
      kategori: kategori as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    }

    const data = await edukasiService.browseEdukasi(filters)

    res.status(200).json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Browse edukasi error:', error)
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' })
  }
}

export const getEdukasiDetailHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const data = await edukasiService.getEdukasiDetail(id)

    if (!data) {
      res.status(404).json({ success: false, message: 'Materi edukasi tidak ditemukan.' })
      return
    }

    // Don't expose uploader_id in detail as per requirement (actually uploader_id was asked not to be in browse, but let's be safe)
    const { uploader_id, ...rest } = data as any

    res.status(200).json({
      success: true,
      data: rest,
    })
  } catch (error: any) {
    console.error('Detail edukasi error:', error)
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' })
  }
}
