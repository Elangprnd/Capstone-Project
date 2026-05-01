import express, { Router } from "express";
import { authMiddleware, authorizeRole } from "../../middlewares/authMiddleware";

const router: Router = express.Router();

/**
 * APPLY MISSION (CAP-64 Implementation)
 * Flow: 
 * 1. authMiddleware: Cek login & expired token (401)
 * 2. authorizeRole: Cek apakah user adalah 'volunteer' (403)
 */
router.post(
  "/:mission_id/apply", 
  authMiddleware, 
  authorizeRole("volunteer"), 
  async (req, res) => {
    const user = (req as any).user;
    const missionId = req.params.mission_id;

    try {
      // Di sini nanti tempat Drizzle ORM berjalan (Tiket selanjutnya)
      // Karena sudah lewat middleware, kita yakin user adalah volunteer yang sah.
      
      return res.status(201).json({
        message: "Berhasil mendaftar misi!",
        data: {
          application_id: 1, // Dummy ID
          mission_id: missionId,
          user_id: user.userId,
          status: "pending",
          applied_at: new Date(),
        }
      });
    } catch (error) {
      console.error("Apply Mission Error:", error);
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

export default router;