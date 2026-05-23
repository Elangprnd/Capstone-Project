import { Request, Response } from 'express'
import { z } from 'zod'
import * as applyService from '../services/apply.services'
import { uploadToCloudinary } from '../services/upload.services'

// ZOD SCHEMAS

// Schema untuk validasi route parameter mission_id
const missionParamSchema = z.object({
  id: z
    .string({ message: 'mission_id wajib diisi' })
    .uuid({ message: 'Format mission_id tidak valid, harus berupa UUID' }),
})

// Schema untuk validasi route parameter application_id
const applicationParamSchema = z.object({
  id: z
    .string({ message: 'application_id wajib diisi' })
    .uuid({ message: 'Format application_id tidak valid, harus berupa UUID' }),
})

const applyBodySchema = z.object({
  mission_id: z
    .string({ message: 'mission_id wajib diisi' })
    .uuid({ message: 'Format mission_id tidak valid' }),
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  birth_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Format tanggal lahir tidak valid',
  }),
  phone_number: z.string().min(1, 'Nomor telepon wajib diisi'),
  domicile: z.string().min(1, 'Domisili wajib diisi'),
  video_link: z
    .string()
    .url('Link video harus berupa URL yang valid')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
})

const rejectBodySchema = z.object({
  reason: z.string().max(255).optional(),
})

// ================================================
// CAP-80: POST /api/apply
// ================================================
export const applyMissionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Merge params into body for validation if mission_id is missing in body
    const bodyToValidate = { ...req.body }
    if (!bodyToValidate.mission_id && req.params.mission_id) {
      bodyToValidate.mission_id = req.params.mission_id
    }

    // 1. Validasi Body
    const parsedBody = applyBodySchema.safeParse(bodyToValidate)
    if (!parsedBody.success) {
      res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'Input tidak valid',
        errors: parsedBody.error.flatten().fieldErrors,
      })
      return
    }

    const { mission_id, full_name, birth_date, phone_number, domicile, video_link } = parsedBody.data

    // 2. Validasi File (Skills)
    if (!req.file) {
      res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'File skills (CV/Portofolio) wajib diupload',
      })
      return
    }

    // 3. Upload ke Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'applications/skills')

    // 4. Panggil Service
    const volunteerId = req.user!.user_id
    const application = await applyService.applyMission({
      missionId: mission_id,
      volunteerId,
      fullName: full_name,
      birthDate: new Date(birth_date),
      phoneNumber: phone_number,
      domicile,
      skillsUrl: uploadResult.secure_url,
      skillsPublicId: uploadResult.public_id,
      videoLink: video_link || undefined,
    })

    res.status(201).json({
      message: 'Berhasil apply misi',
      application_id: application.id,
      status: application.status,
    })
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.error, message: error.message })
      return
    }
    console.error('Apply mission error:', error)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server.' })
  }
}

// ================================================
// CAP-80: GET /api/misi/:id/applicants
// ================================================
export const getApplicantsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedParams = missionParamSchema.safeParse(req.params)
    if (!parsedParams.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        errors: parsedParams.error.flatten().fieldErrors,
      })
      return
    }

    const lembagaId = req.user!.user_id
    const applicants = await applyService.getApplicantsByMission(parsedParams.data.id, lembagaId)

    res.status(200).json(applicants)
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.error, message: error.message })
      return
    }
    console.error('Get applicants error:', error)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server.' })
  }
}

// ================================================
// CAP-80: PATCH /api/apply/:id/approve
// ================================================
export const approveApplicationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedParams = applicationParamSchema.safeParse(req.params)
    if (!parsedParams.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        errors: parsedParams.error.flatten().fieldErrors,
      })
      return
    }

    const lembagaId = req.user!.user_id
    await applyService.approveApplication(parsedParams.data.id, lembagaId)

    res.status(200).json({ message: 'Relawan berhasil di-approve' })
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.error, message: error.message })
      return
    }
    console.error('Approve application error:', error)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server.' })
  }
}

// ================================================
// CAP-80: PATCH /api/apply/:id/reject
// ================================================
export const rejectApplicationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedParams = applicationParamSchema.safeParse(req.params)
    if (!parsedParams.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        errors: parsedParams.error.flatten().fieldErrors,
      })
      return
    }

    const parsedBody = rejectBodySchema.safeParse(req.body || {})
    if (!parsedBody.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Format body tidak valid',
        errors: {
          ...parsedBody.error.flatten().fieldErrors,
          _form: parsedBody.error.flatten().formErrors,
        },
      })
      return
    }

    const lembagaId = req.user!.user_id
    await applyService.rejectApplication(parsedParams.data.id, lembagaId, parsedBody.data.reason)

    res.status(200).json({ message: 'Relawan berhasil ditolak' })
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.error, message: error.message })
      return
    }
    console.error('Reject application error:', error)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server.' })
  }
}

// ================================================
// CAP-80: DELETE /api/apply/:id - Cancel Apply
// ================================================
export const cancelApplicationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedParams = applicationParamSchema.safeParse(req.params)
    if (!parsedParams.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        errors: parsedParams.error.flatten().fieldErrors,
      })
      return
    }

    const volunteerId = req.user!.user_id
    await applyService.cancelApplication(parsedParams.data.id, volunteerId)

    res.status(200).json({ message: 'Pendaftaran berhasil dibatalkan' })
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.error, message: error.message })
      return
    }
    console.error('Cancel application error:', error)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server.' })
  }
}

// ================================================
// CAP-80: GET /api/apply/me
// ================================================
export const getMyApplicationsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const volunteerId = req.user!.user_id
    const applications = await applyService.getMyApplications(volunteerId)
    res.status(200).json(applications)
  } catch (error) {
    console.error('Get my applications error:', error)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server.' })
  }
}

const materialBodySchema = z.object({
  video_link: z
    .string({ message: 'Link video wajib diisi' })
    .url('Link video harus berupa URL yang valid'),
})

export const submitMaterialHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedParams = applicationParamSchema.safeParse(req.params)
    if (!parsedParams.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        errors: parsedParams.error.flatten().fieldErrors,
      })
      return
    }

    const parsedBody = materialBodySchema.safeParse(req.body)
    if (!parsedBody.success) {
      res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'Input tidak valid',
        errors: parsedBody.error.flatten().fieldErrors,
      })
      return
    }

    const volunteerId = req.user!.user_id
    await applyService.submitMaterial(parsedParams.data.id, volunteerId, parsedBody.data.video_link)

    res.status(200).json({ message: 'Material berhasil diupload' })
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.error, message: error.message })
      return
    }
    console.error('Submit material error:', error)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server.' })
  }
}
