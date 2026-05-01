
import { db } from '../config/db'
import { users, passwordResetTokens } from '../db/schemas'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { signToken } from '../config/jwt'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import nodemailer from 'nodemailer'


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


// CAP-61: FORGOT PASSWORD
export const forgotPassword = async (email: string) => {
  // Respon SELALU sama, tidak peduli email ada atau tidak
  // Ini untuk mencegah attacker mengetahui email mana yang terdaftar

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  // Jika email tidak ditemukan, tetap return success (jangan bocorkan info)
  if (!user) return

  // Jika akun Google, jangan kirim email reset
  if (user.authProvider === 'google') return

  // Generate token yang cryptographically secure
  const rawToken = crypto.randomBytes(32).toString('hex')
  
  // Simpan hash-nya di DB, bukan raw token-nya
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 jam

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  })

  // Kirim email dengan link reset
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`
  await sendResetEmail(user.email, resetLink)
}

// Helper: kirim email
const sendResetEmail = async (to: string, resetLink: string) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from: `"VOLETRA" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset Password VOLETRA',
    html: `
      <h2>Reset Password</h2>
      <p>Klik link berikut untuk mereset password kamu (berlaku 1 jam):</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Jika kamu tidak meminta ini, abaikan email ini.</p>
    `,
  })
}


// CAP-61: RESET PASSWORD
export const resetPassword = async (data: { token: string; new_password: string }) => {
  // 1. Hash token yang masuk untuk dicocokkan dengan DB
  const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex')

  // 2. Cari token di DB
  const resetToken = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.tokenHash, tokenHash),
  })

  // 3. Validasi token
  if (!resetToken) {
    throw { status: 410, message: 'Link reset sudah tidak valid atau sudah digunakan.' }
  }

  // 4. Cek apakah sudah kedaluwarsa
  if (new Date() > resetToken.expiresAt) {
    throw { status: 410, message: 'Link reset sudah kedaluwarsa.' }
  }

  // 5. Cek apakah sudah digunakan
  if (resetToken.usedAt) {
    throw { status: 410, message: 'Link reset sudah pernah digunakan.' }
  }

  // 6. Update password dan tandai token sebagai sudah digunakan
  const newPasswordHash = await bcrypt.hash(data.new_password, BCRYPT_COST)

  await db.transaction(async (tx) => {
    // Update password user
    await tx.update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId))

    // Tandai token sudah digunakan (tidak bisa dipakai lagi)
    await tx.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id))
  })
}