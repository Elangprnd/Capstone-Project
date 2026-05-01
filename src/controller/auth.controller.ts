import { Request, Response } from 'express'
import { z } from 'zod'
import * as authService from '../services/auth.services'
import { recordFailedLogin, resetLoginAttempts } from '../middlewares/rateLimiter'


// CAP-57: REGISTER RELAWAN
// Validasi input dengan Zod
const registerVolunteerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf besar')
    .regex(/[0-9]/, 'Password harus mengandung minimal 1 angka'),
  confirm_password: z.string(),
  role: z.literal('volunteer'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Password dan konfirmasi password tidak cocok',
  path: ['confirm_password'],
})

//handler buat ke routes api (req => res)
export const registerVolunteerHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validasi input
    const parsed = registerVolunteerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    // 2. Panggil service
    const { token, user } = await authService.registerVolunteer({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    })

    // 3. Set cookie dan return response
    authService.setAuthCookie(res, token)               // ada di services auth = cookie

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil!',
      data: {
        user_id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        redirect_url: '/',                           // Landing page logged-in
      },
    })

  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ success: false, message: error.message })
      return
    }
    console.error('Register error:', error)
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' })
  }
}



// CAP-58: REGISTER LEMBAGA
const registerLembagaSchema = z.object({
  institution_name: z.string().min(2, 'Nama institusi minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf besar')
    .regex(/[0-9]/, 'Password harus mengandung minimal 1 angka'),
  confirm_password: z.string(),
  role: z.literal('lembaga'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Password dan konfirmasi password tidak cocok',
  path: ['confirm_password'],
})

// handler buat ke routes api (req => res)
export const registerLembagaHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerLembagaSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    const { token, user } = await authService.registerLembaga({
      name: parsed.data.institution_name,
      email: parsed.data.email,
      password: parsed.data.password,
    })

    authService.setAuthCookie(res, token)       // ada di services auth = cookie

    res.status(201).json({
      success: true,
      message: 'Registrasi institusi berhasil!',
      data: {
        user_id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        redirect_url: '/dashboard/pelapor',             // Langsung ke dashboard pelapor
      },
    })

  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ success: false, message: error.message })
      return
    }
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' })
  }
}


// CAP-59: UNIFIED LOGIN       (login)
const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})
// handler login buat ke routes api (req => res)
export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || 'unknown'

  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    const { token, user, redirectUrl } = await authService.login(parsed.data)       //auth service login


    // Reset percobaan login gagal setelah sukses
    resetLoginAttempts(ip)

    authService.setAuthCookie(res, token)

    res.status(200).json({
      success: true,
      message: 'Login berhasil!',
      data: {
        role: user.role,
        redirect_url: redirectUrl,
      },
    })


  } catch (error: any) {
    // Catat percobaan login gagal untuk rate limiter (maks 5x try )

    if (error.status === 401) {
      recordFailedLogin(ip)                     // middleware rate limiter 
    }

    if (error.status) {
      res.status(error.status).json({ success: false, message: error.message })
      return
    }
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' })
  }
}


// LOGOUT
export const logoutHandler = (req: Request, res: Response): void => {
  // Hapus cookie dengan set Max-Age: 0
  res.cookie('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })

  res.status(200).json({ success: true, message: 'Logout berhasil.' })
}



// CAP-60: GOOGLE OAUTH
const googleAuthSchema = z.object({
  id_token: z.string().min(1, 'id_token wajib diisi'),
})

// handler login google buat ke routes api (req => res)
export const googleAuthHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = googleAuthSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    const { token, user, isNewUser } = await authService.googleAuth(parsed.data.id_token)

    authService.setAuthCookie(res, token)

    res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser ? 'Akun berhasil dibuat via Google!' : 'Login berhasil!',
      data: {
        role: user.role,
        redirect_url: '/',          // langsung direct ke landing page 
      },
    })

  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ success: false, message: error.message })
      return
    }
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' })
  }
}