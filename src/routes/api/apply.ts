import express, { Router, Request, Response } from "express";
import { authMiddleware, authorizeRole } from "../../middlewares/authMiddleware.js";
import { db } from "../../db/index.js"; 
import { missions, applications } from "../../db/schema.js"; 
import { eq, and } from "drizzle-orm";

const router: Router = express.Router();

/**
 * Endpoint untuk melihat riwayat pendaftaran (CAP-68)
 */
router.get("/me/status", authMiddleware, authorizeRole("volunteer"), async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  try {
    const userApplications = await db.select({
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
    .where(eq(applications.volunteerId, userId));

    const formattedData = userApplications.map((app) => ({
      ...app,
      mission_title: app.mission_title ?? "[Misi dihapus]",
      mission_location: app.mission_location ?? "N/A",
      coordinator_whatsapp: app.application_status === "approved" ? app.coordinator_whatsapp : null
    }));

    return res.status(200).json({ applications: formattedData });
  } catch (error) {
    console.error("Fetch Status Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Endpoint Pendaftaran Misi dengan Penanganan Race Condition (CAP-69)
 */
router.post("/:mission_id/apply", 
  authMiddleware, 
  authorizeRole("volunteer"), 
  async (req: Request<{ mission_id: string }>, res: Response) => {
    const { mission_id } = req.params;
    const missionId = parseInt(mission_id);
    const userId = (req as any).user?.id;

    try {
      /**
       * Menggunakan Database Transaction untuk menjamin atomisitas.
       * Jika terjadi error di tengah jalan, semua perubahan akan dibatalkan (rollback).
       */
      const result = await db.transaction(async (tx) => {
        
        /**
         * 1. Acquire Row-Level Lock menggunakan .for('update')
         * Ini akan mengunci baris misi ini di PostgreSQL. Request lain yang mencoba 
         * mengakses baris yang sama akan "antre" sampai transaksi ini selesai (Commit/Rollback).
         */
        const [mission] = await tx.select()
          .from(missions)
          .where(eq(missions.id, missionId))
          .for('update'); 

        if (!mission) {
          return { status: 404, message: { error: "MISSION_NOT_FOUND" } };
        }

        /**
         * 2. Re-check Kuota di dalam Lock
         * Karena baris dikunci, data 'volunteersApplied' di sini dijamin yang paling update.
         */
        const applied = mission.volunteersApplied ?? 0;
        const needed = mission.volunteersNeeded ?? 0;

        if (applied >= needed) {
          return { status: 409, message: { error: "QUOTA_FULL", message: "Kuota penuh." } };
        }

        // 3. Re-check Duplikasi (mencegah pendaftaran ganda)
        const [existingApply] = await tx.select()
          .from(applications)
          .where(and(eq(applications.volunteerId, userId), eq(applications.missionId, missionId)))
          .limit(1);

        if (existingApply) {
          return { status: 409, message: { error: "ALREADY_APPLIED" } };
        }

        // 4. Proses Insert Pendaftaran
        await tx.insert(applications).values({
          volunteerId: userId,
          missionId: missionId,
          status: "pending"
        });

        // 5. Update jumlah pendaftar di tabel missions secara atomik (+1)
        const newAppliedCount = applied + 1;
        await tx.update(missions)
          .set({ volunteersApplied: newAppliedCount })
          .where(eq(missions.id, missionId));

        /**
         * 6. Update status misi otomatis jika kuota sudah terpenuhi sempurna.
         * Sesuai kriteria: ubah status ke 'relawan_terkumpul'.
         */
        if (newAppliedCount === needed) {
          await tx.update(missions)
            .set({ status: "relawan_terkumpul" })
            .where(eq(missions.id, missionId));
        }

        return { status: 201, message: { message: "Berhasil mendaftar misi!" } };
      });

      return res.status(result.status).json(result.message);

    } catch (error: any) {
      // Penanganan Error Postgres (Unique Constraint Violation)
      if (error.code === "23505") {
        return res.status(409).json({ error: "ALREADY_APPLIED" });
      }

      console.error("CAP-69 Race Condition Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
});

export default router;