import express, { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware";

const router: Router = express.Router();

// APPLY MISSION (TIKET 63 - DUMMY VERSION)
router.post("/:mission_id/apply", authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const missionId = req.params.mission_id;

  try {
    // =========================
    // GUARD 1: AUTH (dari middleware)
    // =========================
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // =========================
    // SIMULASI GUARD LAINNYA (LOLOS SEMUA)
    // =========================

    // =========================
    // RESPONSE SESUAI ACCEPTANCE CRITERIA
    // =========================
    return res.status(201).json({
      application_id: 1,
      mission_id: missionId,
      status: "pending",
      applied_at: new Date(),
    });

  } catch (error) {
    console.error("Apply error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;