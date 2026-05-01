import express, { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware";
import { db } from "../../config/db";
import { missions, applications } from "../../db/schemas";
import { eq, and } from "drizzle-orm";

const router: Router = express.Router();

/**
 * Endpoint untuk mendapatkan riwayat pendaftaran relawan.
 * Mengimplementasikan isolasi data agar relawan hanya bisa melihat aplikasi miliknya sendiri.
 */
router.get(
  "/me/status",
  authenticate,
  authorize("volunteer"),
  async (req: Request, res: Response) => {
    const volunteerId = req.user?.user_id;

    if (!volunteerId || typeof volunteerId !== "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Menggunakan LEFT JOIN agar data pendaftaran tetap aman meskipun misi terkait dihapus
      const userApplications = await db
        .select({
          application_id: applications.id,
          mission_id: applications.missionId,
          mission_title: missions.title,
          mission_location: missions.location,
          application_status: applications.status,
          applied_at: applications.createdAt,
          coordinator_whatsapp: missions.coordinatorWhatsapp,
        })
        .from(applications)
        .leftJoin(missions, eq(applications.missionId, missions.id))
        .where(eq(applications.volunteerId, volunteerId));

      const formattedData = userApplications.map((app) => ({
        application_id: app.application_id,
        mission_id: app.mission_id,
        // Fallback jika judul misi tidak ditemukan (misi dihapus)
        mission_title: app.mission_title ?? "[Misi dihapus]",
        mission_location: app.mission_location ?? "N/A",
        application_status: app.application_status,
        applied_at: app.applied_at,
        /**
         * Kontrol akses informasi: Nomor WhatsApp koordinator hanya
         * ditampilkan jika pendaftaran sudah disetujui (Approved).
         */
        coordinator_whatsapp:
          app.application_status === "approved"
            ? app.coordinator_whatsapp
            : null,
      }));

      return res.status(200).json({ applications: formattedData });
    } catch (error) {
      console.error("Fetch Status Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
);

/**
 * Endpoint untuk mendaftarkan relawan ke sebuah misi.
 * Mencakup validasi keberadaan misi, status pendaftaran, kuota, dan pencegahan duplikasi.
 */
router.post(
  "/:mission_id/apply",
  authenticate,
  authorize("volunteer"),
  async (req: Request<{ mission_id: string }>, res: Response) => {
    const { mission_id } = req.params;
    const missionId = parseInt(mission_id);
    const userId = req.user?.user_id;

    try {
      // Validasi: Apakah misi eksis di database?
      const missionData = await db
        .select()
        .from(missions)
        .where(eq(missions.id, missionId))
        .limit(1);

      if (missionData.length === 0) {
        return res.status(404).json({
          error: "MISSION_NOT_FOUND",
          message: "Misi tidak ditemukan.",
        });
      }

      const mission = missionData[0];

      // Validasi: Apakah misi masih dalam periode penerimaan relawan?
      const allowedStatuses = ["menunggu_relawan", "sedang_berjalan"];
      if (!allowedStatuses.includes(mission.status)) {
        return res.status(409).json({
          error: "MISSION_CLOSED",
          message: "Misi ini sudah tidak menerima pendaftaran.",
        });
      }

      // Validasi: Cek apakah kuota relawan masih mencukupi
      const applied = mission.volunteersApplied ?? 0;
      const needed = mission.volunteersNeeded ?? 0;

      if (needed <= 0 || applied >= needed) {
        return res.status(409).json({
          error: "QUOTA_FULL",
          message: "Kuota relawan untuk misi ini sudah terpenuhi.",
        });
      }

      // Validasi: Mencegah user mendaftar ulang pada misi yang sama
      const existingApply = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.volunteerId, userId as any),
            eq(applications.missionId, missionId),
          ),
        )
        .limit(1);

      if (existingApply.length > 0) {
        return res.status(409).json({
          error: "ALREADY_APPLIED",
          status: existingApply[0].status,
          message: "Anda sudah mendaftar misi ini.",
        });
      }

      return res.status(201).json({
        message: "Berhasil mendaftar misi!",
        data: { mission_id: missionId, status: "pending" },
      });
    } catch (error: any) {
      // Penanganan khusus untuk menjaga integritas data (unique constraint)
      if (error.code === "23505") {
        return res.status(409).json({
          error: "ALREADY_APPLIED",
          message: "Anda sudah mendaftar misi ini.",
        });
      }

      console.error("Apply Mission Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
);

router.get("/me", (req: Request, res: Response) => {
  res.status(200).json({ message: "get my applications endpoint" });
});

export default router;
