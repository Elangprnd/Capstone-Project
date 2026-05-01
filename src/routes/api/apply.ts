import express, { Router } from "express";
// Import middleware dan db dengan ekstensi .js untuk ESM
import { authMiddleware, authorizeRole } from "../../middlewares/authMiddleware.js";
import { db } from "../../db/index.js"; 
import { missions, applications } from "../../db/schema.js"; 
import { eq, and } from "drizzle-orm";

const router: Router = express.Router();

// --- GET MY APPLICATIONS (CAP-63) ---
router.get("/me", (req, res) => {
  res.status(200).json({ message: "get my applications endpoint" });
});

/**
 * APPLY MISSION (CAP-63 s/d CAP-67 Implementation)
 * Alur Guard: Auth -> Role -> Existence (404) -> Status (409) -> Quota (409) -> Duplicate (409)
 */
router.post("/:mission_id/apply", 
  authMiddleware, 
  authorizeRole("volunteer"), 
  async (req, res) => {
    const missionId = parseInt(req.params.mission_id);
    const userId = (req as any).user?.id; // Diambil dari decoded token

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
      const allowedStatuses = ["menunggu_relawan", "sedang_berjalan"];
      if (!allowedStatuses.includes(mission.status)) {
        return res.status(409).json({ 
          error: "MISSION_CLOSED", 
          message: "Misi ini sudah tidak menerima pendaftaran." 
        });
      }

      // 3. Guard: Quota Check (CAP-66 - 409)
      const applied = mission.volunteersApplied ?? 0;
      const needed = mission.volunteersNeeded ?? 0;

      if (needed <= 0 || applied >= needed) {
        return res.status(409).json({ 
          error: "QUOTA_FULL", 
          message: "Kuota relawan untuk misi ini sudah terpenuhi." 
        });
      }

      // 4. Guard: Duplicate Check (CAP-67 - 409)
      const existingApply = await db.select()
        .from(applications)
        .where(
          and(
            eq(applications.volunteerId, userId),
            eq(applications.missionId, missionId)
          )
        )
        .limit(1);

      if (existingApply.length > 0) {
        return res.status(409).json({ 
          error: "ALREADY_APPLIED", 
          status: existingApply[0].status, 
          message: "Anda sudah mendaftar misi ini." 
        });
      }

      // 5. Success Output
      return res.status(201).json({
        message: "Berhasil mendaftar misi!",
        data: { mission_id: missionId, status: "pending" }
      });

    } catch (error: any) {
      // Handle Race Condition (Unique Constraint Violation)
      if (error.code === "23505") {
        return res.status(409).json({ 
          error: "ALREADY_APPLIED", 
          message: "Anda sudah mendaftar misi ini." 
        });
      }

      console.error("Apply Mission Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
});

export default router;