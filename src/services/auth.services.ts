
import { db } from '../config/db'
import { users, passwordResetTokens } from '../db/schemas'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { signToken } from '../config/jwt'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'

const BCRYPT_COST = 10                  // ini buat hash pasword
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)         // ini buat auth google

// Helper: set cookie JWT ke response //
export const setAuthCookie = (res: any, token: string): void => {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
  })
}



// cap 57 register volunteer
export const registerVolunteer = async (data: {
  name: string
  email: string
  password: string
}) => {
  
  // Cek email duplikat
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  })
  if (existing) {
    throw { status: 409, message: 'Email sudah terdaftar. Silakan login.' }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST)

  // Insert ke database dengan transaction
  const newUser = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'volunteer',            // role nya volunteer
      authProvider: 'email',
      isProfileComplete: false,
    }).returning()
    return created
  })

  // Buat token
  const token = signToken({
    user_id: newUser.id,
    role: newUser.role,
    auth_provider: newUser.authProvider,
  })

  return { token, user: newUser }
}




// CAP-58: REGISTER LEMBAGA
export const registerLembaga = async (data: {
  name: string
  email: string
  password: string
}) => {
  // Cek email sudah terdaftar
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  })

  if (existingUser) {
    throw { status: 409, message: 'Email sudah terdaftar. Silakan login.' }
  }
  // Hash password
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST)

  // Insert ke database dengan transaction
  const newUser = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'lembaga',                  // Perbedaan utama dari register relawan
      authProvider: 'email',
      isProfileComplete: false,
    }).returning()
    return created
  })

  const token = signToken({
    user_id: newUser.id,
    role: newUser.role,
    auth_provider: newUser.authProvider,
  })

  return { token, user: newUser }
}


// CAP-59: UNIFIED LOGIN
export const login = async (data: { email: string; password: string }) => {
  // 1. Cari user berdasarkan email
  const user = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  })

  // 2. Jika user tidak ada atau password salah
  if (!user || !user.passwordHash) {
    throw { status: 401, message: 'Email atau kata sandi salah.' }
  }

  // 3. Verifikasi password
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash)
  if (!isPasswordValid) {
    throw { status: 401, message: 'Email atau kata sandi salah.' }
  }

  // 4. Cek apakah akun aktif
  if (!user.isActive) {
    throw { status: 403, message: 'Akun Anda telah dinonaktifkan.' }
  }

  // 5. Tentukan redirect URL berdasarkan role
  const redirectUrl = user.role === 'lembaga' 
    ? '/dashboard/pelapor' 
    : '/'

  // 6. Buat JWT token
  const token = signToken({
    user_id: user.id,
    role: user.role,
    auth_provider: user.authProvider,
  })

  return { token, user, redirectUrl }
}



// CAP-60: GOOGLE OAUTH     (login pake google/daftar)
export const googleAuth = async (idToken: string) => {
  // 1. Verifikasi id_token menggunakan Google public keys
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  })

  const payload = ticket.getPayload()
  if (!payload || !payload.email) {
    throw { status: 400, message: 'Token Google tidak valid.' }
  }

  const { email, name } = payload

  // 2. Cek apakah email sudah terdaftar
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  if (existingUser) {
    // Jika email terdaftar sebagai lembaga, tolak
    if (existingUser.role === 'lembaga') {              //role = lembaga
      throw {
        status: 409,
        message: 'Email ini terdaftar sebagai Institusi. Gunakan login biasa.',
      }
    }

    // Jika sudah ada sebagai volunteer, langsung login
    const token = signToken({
      user_id: existingUser.id,
      role: existingUser.role,
      auth_provider: existingUser.authProvider,
    })

    return { token, user: existingUser, isNewUser: false }
  }

  // 3. Jika belum ada, buat akun baru sebagai volunteer
  const newUser = await db.transaction(async (tx) => {  
    const [created] = await tx.insert(users).values({
      name: name || email.split('@')[0],
      email,
      passwordHash: null,                // Google user tidak punya password jadi null
      role: 'volunteer',
      authProvider: 'google',            // auth_provider = google (enum)
      isProfileComplete: false,
    }).returning()
    return created
  })
    // buat token trus sign 
  const token = signToken({
    user_id: newUser.id,
    role: newUser.role,
    auth_provider: newUser.authProvider,
  })

  return { token, user: newUser, isNewUser: true }
}