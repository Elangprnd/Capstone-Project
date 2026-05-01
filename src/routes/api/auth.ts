import express, { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const router: Router = express.Router();

// LOGIN
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // 1. Cari user di database berdasarkan email
    const [user] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    // 2. Jika user tidak ditemukan
    if (!user) {
      return res.status(401).json({ message: "Email tidak terdaftar" });
    }

    // 3. Bandingkan password (karena di Drizzle tadi kita isi plain text, kita bandingkan langsung)
    // Catatan: Di project asli nanti, baiknya pakai bcrypt.compare()
    if (user.password !== password) {
      return res.status(401).json({ message: "Password salah!" });
    }

    // 4. Jika email & password benar, buat payload dari data asli database
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role, // Ini penting agar authorizeRole("pelapor") di misi.ts jalan
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "login success",
      token,
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ... endpoint lainnya (register, logout, dll)

export default router;