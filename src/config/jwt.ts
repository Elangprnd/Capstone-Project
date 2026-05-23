import jwt from 'jsonwebtoken'

export interface JwtPayload {
  user_id: string
  role: 'volunteer' | 'lembaga' | 'super_admin'
  auth_provider: 'email' | 'google'
  iat?: number
  exp?: number
}

// Helper untuk load keys dari environment dengan handle escape newline
const getPrivateKey = () => {
  let key = process.env.JWT_PRIVATE_KEY
  if (!key) throw new Error('JWT_PRIVATE_KEY is not defined in .env')
  
  // Remove surrounding quotes if they exist
  key = key.trim()
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1)
  }
  
  return key.replace(/\\n/g, '\n')
}

const getPublicKey = () => {
  let key = process.env.JWT_PUBLIC_KEY
  if (!key) throw new Error('JWT_PUBLIC_KEY is not defined in .env')
  
  // Remove surrounding quotes if they exist
  key = key.trim()
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1)
  }
  
  return key.replace(/\\n/g, '\n')
}

export const signToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, getPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: '24h',
  })
}

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, getPublicKey(), {
      algorithms: ['RS256'],
    }) as JwtPayload
  } catch (error: any) {
    console.error('JWT Verification Error:', error.message)
    throw error
  }
}