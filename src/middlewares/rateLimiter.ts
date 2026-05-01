import { Request, Response, NextFunction } from 'express'

// Menyimpan data percobaan login per IP
// Di production sebaiknya pakai Redis
const loginAttempts = new Map<string, { count: number; lockedUntil: number | null }>()

const MAX_ATTEMPTS = 5        // Maksimal 5 kali gagal
const WINDOW_MS = 10 * 60 * 1000  // Dalam 10 menit
const LOCK_DURATION = 15 * 60 * 1000  // Lock 15 menit

export const loginRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (record) {
    // Cek apakah IP sedang dalam status locked
    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000)
      res.status(429).json({
        success: false,
        message: `Terlalu banyak percobaan login. Coba lagi dalam ${remainingMinutes} menit.`,
      })
      return
    }

    // Reset jika sudah lewat window time
    if (record.lockedUntil && now >= record.lockedUntil) {
      loginAttempts.delete(ip)
    }
  }

  next()
}

// Fungsi untuk mencatat gagal login (dipanggil dari controller)
export const recordFailedLogin = (ip: string): void => {
  const now = Date.now()
  const record = loginAttempts.get(ip) || { count: 0, lockedUntil: null }

  record.count += 1

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_DURATION
  }

  loginAttempts.set(ip, record)
}

// Fungsi untuk reset setelah login sukses
export const resetLoginAttempts = (ip: string): void => {
  loginAttempts.delete(ip)
}