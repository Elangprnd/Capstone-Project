import jwt from 'jsonwebtoken'

// Interface untuk payload JWT
export interface JwtPayload {
  user_id: string
  role: 'volunteer' | 'lembaga' | 'super_admin'
  auth_provider: 'email' | 'google'
  iat?: number
  exp?: number
}

// Ambil keys dari environment
const privateKey = process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n')
const publicKey = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n')

// Fungsi untuk membuat JWT token
export const signToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',   // Asymmetric encryption
    expiresIn: '24h',     // Token expired dalam 24 jam
  })
}

// Fungsi untuk verifikasi JWT token
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
  }) as JwtPayload
}

