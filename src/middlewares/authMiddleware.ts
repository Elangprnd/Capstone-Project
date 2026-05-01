import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../config/jwt'

// Extend Request supaya bisa simpan data user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    
    // Ambil token dari cookie
    const token = req.cookies?.access_token

    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'Akses ditolak. Silakan login terlebih dahulu.' 
      })
      return
    }

    // Verifikasi token
    const decoded = verifyToken(token)
    req.user = decoded
    next()

  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token tidak valid atau sudah expired.' 
    })
  }
}

// cek role
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        message: 'Anda tidak memiliki akses ke resource ini.' 
      })
      return
    }
    next()
  }
}