import { Request, Response } from 'express'
import { z } from 'zod'
import * as applyService from '../services/apply.services'


// ZOD SCHEMAS


// Schema untuk validasi route parameter mission_id
const missionParamSchema = z.object({
  mission_id: z
    .string({ message: 'mission_id wajib diisi' })
    .uuid({ message: 'Format mission_id tidak valid, harus berupa UUID' }),
})

// Schema untuk validasi route parameter application_id
const applicationParamSchema = z.object({
  id: z
    .string({ message: 'application_id wajib diisi' })
    .uuid({ message: 'Format application_id tidak valid, harus berupa UUID' }),
})

// CAP-63 sd CAP-69: POST /api/missions/:mission_id/apply

export const applyMissionHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {

    // Validasi route parameter dengan Zod
    const parsedParams = missionParamSchema.safeParse(req.params)
    if (!parsedParams.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Format mission_id tidak valid',
        errors: parsedParams.error.flatten().fieldErrors,
      })
      return
    }

    // Setelah validasi lolos, data sudah aman dipakai
    const volunteerId = req.user!.user_id
    const { mission_id: missionId } = parsedParams.data

    const application = await applyService.applyMission({
      missionId,
      volunteerId,
    })

    res.status(201).json({
      success: true,
      data: {
        application_id: application.id,
        mission_id: application.mission_id,
        status: application.status,
        applied_at: application.applied_at,
      },
    })

  } catch (error: any) {
    if (error.status) {
      const response: any = {
        error: error.error,
        message: error.message,
      }
      if (error.error === 'ALREADY_APPLIED') {
        response.status = error.existingStatus
      }
      res.status(error.status).json(response)
      return
    }

    console.error('Apply mission error:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan server.',
    })
  }
}

// ================================================
// CAP-68: GET /api/apply/me
// ================================================
export const getMyApplicationsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {

    // Tidak ada parameter yang perlu divalidasi di endpoint ini
    // volunteerId diambil langsung dari JWT token yang sudah terverifikasi
    const volunteerId = req.user!.user_id

    const applications = await applyService.getMyApplications(volunteerId)

    res.status(200).json({
      success: true,
      data: { applications },
    })

  } catch (error) {
    console.error('Get my applications error:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan server.',
    })
  }
}

// ================================================
// DELETE /api/apply/:id — Batalkan lamaran
// ================================================

// Schema tambahan untuk validasi body cancel (opsional reason)
const cancelApplicationSchema = z.object({
  reason: z.string().max(255).optional(),
})

export const cancelApplicationHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {

    // Validasi route parameter
    const parsedParams = applicationParamSchema.safeParse(req.params)
    if (!parsedParams.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Format application_id tidak valid',
        errors: parsedParams.error.flatten().fieldErrors,
      })
      return
    }

    // Validasi body (opsional)
    const parsedBody = cancelApplicationSchema.safeParse(req.body)
    if (!parsedBody.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Format body tidak valid',
        errors: parsedBody.error.flatten().fieldErrors,
      })
      return
    }

    // Lanjut ke service (implementasi Sprint 2)
    res.status(200).json({ 
      message: 'cancel apply endpoint - coming soon' 
    })

  } catch (error) {
    console.error('Cancel application error:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan server.',
    })
  }
}