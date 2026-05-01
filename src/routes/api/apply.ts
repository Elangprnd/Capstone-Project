import express, { Router } from "express";
import { authMiddleware, authorizeRole } from "../../middlewares/authMiddleware";
import { db } from "../../db/index"; 
import { missions } from "../../db/schema";
import { eq } from "drizzle-orm";

const router: Router = express.Router();

// --- GET MY APPLICATIONS ---
router.get("/me", (req, res) => {
  res.status(200).json({ message: "get my applications endpoint" });
});

/**
 * APPLY MISSION (CAP-65 Implementation)
 * Logic:
 * 1. Auth & Role Guard (401 & 403)
 * 2. Existense Guard (404)
 * 3. Status Guard (409)
 */
router.post("/:mission_id/apply", 
  authMiddleware, 
  authorizeRole("volunteer"), 
  async (req, res) => {
    const missionId = parseInt(req.params.mission_id);

    try {
      // 1. Guard: Cek apakah misi eksis (Acceptance Criteria 404)
      const missionData = await db.select()
        .from(missions)
        .where(eq(missions.id, missionId))
        .limit(1);
      
      if (missionData.length === 0) {
        return res.status(404).json({ 
          error: "MISSION_NOT_FOUND",
          message: "Misi tidak ditemukan." 
        });
      }

      const mission = missionData[0];

      // 2. Guard: Cek status misi (Acceptance Criteria 409)
      // Reject jika status bukan "menunggu_relawan" atau "sedang_berjalan"
      const allowedStatuses = ["menunggu_relawan", "sedang_berjalan"];
      if (!allowedStatuses.includes(mission.status)) {
        return res.status(409).json({ 
          error: "MISSION_CLOSED", 
          message: "Misi ini sudah tidak menerima pendaftaran." 
        });
      }

      // 3. Success Output
      // Catatan: Belum implement write ke database pendaftaran (Tiket CAP-63)
      return res.status(201).json({
        message: "Berhasil mendaftar misi!",
        data: {
          mission_id: missionId,
          status: "pending",
          applied_at: new Date()
        }
      });

    } catch (error) {
      console.error("CAP-65 Error:", error);
      return res.status(500).json({ 
        message: "Internal server error" 
      });
    }
});

// --- CANCEL APPLY ---
router.delete("/:id", (req, res) => {
  res.status(200).json({ message: `cancel apply id: ${req.params.id}` });
});

// --- APPROVE APPLY ---
router.patch("/:id/approve", (req, res) => {
  res.status(200).json({ message: `approve apply id: ${req.params.id}` });
});

// --- REJECT APPLY ---
router.patch("/:id/reject", (req, res) => {
  res.status(200).json({ message: `reject apply id: ${req.params.id}` });
});

export default router;