import express, { Router } from "express";
import { authMiddleware, authorizeRole } from "../../middlewares/authMiddleware.js";
import { db } from "../../db/index.js"; 
import { missions } from "../../db/schema.js"; 
import { eq } from "drizzle-orm";

const router: Router = express.Router();

// --- GET MY APPLICATIONS ---
router.get("/me", (req, res) => {
  res.status(200).json({ message: "get my applications endpoint" });
});

/**
 * APPLY MISSION (CAP-65 & CAP-66 Implementation)
 * Alur Guard: Auth -> Role -> Existence (404) -> Status (409) -> Quota (409)
 */
router.post("/:mission_id/apply", 
  authMiddleware, 
  authorizeRole("volunteer"), 
  async (req, res) => {
    // Ambil mission_id dari URL parameter
    const missionId = parseInt(req.params.mission_id);

    try {
      // 1. Guard: Existence (CAP-65 - 404)
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

      // 2. Guard: Status (CAP-65 - 409)
      // Menolak jika misi sudah selesai atau dalam status lain yang tidak menerima pendaftaran
      const allowedStatuses = ["menunggu_relawan", "sedang_berjalan"];
      if (!allowedStatuses.includes(mission.status)) {
        return res.status(409).json({ 
          error: "MISSION_CLOSED", 
          message: "Misi ini sudah tidak menerima pendaftaran." 
        });
      }

      // 3. Guard: Quota Check (CAP-66 - 409)
      // Menangani celah eventual consistency (quota penuh tapi status belum update)
      const applied = mission.volunteersApplied ?? 0;
      const needed = mission.volunteersNeeded ?? 0;

      if (needed <= 0 || applied >= needed) {
        return res.status(409).json({ 
          error: "QUOTA_FULL", 
          message: "Kuota relawan untuk misi ini sudah terpenuhi." 
        });
      }

      // 4. Success Output (Sesuai kriteria CAP-66: Belum ada penulisan data ke DB pendaftaran)
      return res.status(201).json({
        message: "Berhasil mendaftar misi!",
        data: {
          mission_id: missionId,
          status: "pending"
        }
      });

    } catch (error) {
      console.error("Apply Mission Error:", error);
      return res.status(500).json({ 
        message: "Internal server error" 
      });
    }
});

// --- ENDPOINT LAINNYA ---
router.delete("/:id", (req, res) => {
  res.status(200).json({ message: `cancel apply id: ${req.params.id}` });
});

router.patch("/:id/approve", (req, res) => {
  res.status(200).json({ message: `approve apply id: ${req.params.id}` });
});

router.patch("/:id/reject", (req, res) => {
  res.status(200).json({ message: `reject apply id: ${req.params.id}` });
});

export default router;