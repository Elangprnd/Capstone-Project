import express, { Router, Request, Response } from "express";
import { db } from "../../db/index.js";
import { missions } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { getCoordinates } from "../../utils/geocoding.js"; 
import { authMiddleware, authorizeRole } from "../../middlewares/authMiddleware.js";

const router: Router = express.Router();

/**
 * 1. CREATE MISSION (POST /api/misi)
 * Role: Pelapor Only
 */
router.post("/", authMiddleware, authorizeRole("pelapor"), async (req: Request, res: Response) => {
  const { judul, deskripsi, kategori, alamat, jumlah_relawan } = req.body;

  if (!judul || !alamat || !jumlah_relawan) {
    return res.status(400).json({ 
      error: "DATA_INCOMPLETE", 
      message: "Judul, alamat, dan jumlah relawan wajib diisi" 
    });
  }

  try {
    const coords = await getCoordinates(alamat);

    const [newMission] = await db.insert(missions).values({
      title: judul,
      description: deskripsi,
      category: kategori,
      address: alamat,
      latitude: coords.latitude,
      longitude: coords.longitude,
      volunteersNeeded: jumlah_relawan,
      status: "Open", 
    }).returning({ id: missions.id });

    return res.status(201).json({
      id: newMission.id,
      message: "Misi berhasil dibuat"
    });

  } catch (error: any) {
    if (error.message === "LOKASI_TIDAK_VALID") {
      return res.status(400).json({ error: "Lokasi tidak valid" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 2. GET ALL MISSIONS (GET /api/misi)

router.get("/", async (req: Request, res: Response) => {
  try {
    const allMissions = await db.select({
      id: missions.id,
      judul: missions.title,
      kategori: missions.category,
      latitude: missions.latitude,
      longitude: missions.longitude,
      status: missions.status,
      jumlah_relawan: missions.volunteersNeeded
    })
    .from(missions)
    .where(eq(missions.isDeleted, false));

    return res.status(200).json(allMissions);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 3. GET DETAIL MISI (GET /api/misi/:id) Menggunakan casting 'as string' agar tidak merah

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const missionId = parseInt(req.params.id as string);
    const [mission] = await db.select()
      .from(missions)
      .where(and(eq(missions.id, missionId), eq(missions.isDeleted, false)));

    if (!mission) {
      return res.status(404).json({ error: "ID tidak ditemukan" });
    }

    return res.status(200).json(mission);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 4. UPDATE MISI (PUT /api/misi/:id)

router.put("/:id", authMiddleware, authorizeRole("pelapor"), async (req: Request, res: Response) => {
  const { judul, deskripsi, kategori, alamat, jumlah_relawan } = req.body;
  const missionId = parseInt(req.params.id as string);

  try {
    const [existingMission] = await db.select().from(missions).where(eq(missions.id, missionId));
    
    if (!existingMission) {
      return res.status(404).json({ error: "Misi tidak ditemukan" });
    }

    let updatedCoords = { 
      latitude: existingMission.latitude, 
      longitude: existingMission.longitude 
    };

    if (alamat && alamat !== existingMission.address) {
      updatedCoords = await getCoordinates(alamat);
    }

    await db.update(missions)
      .set({
        title: judul ?? existingMission.title,
        description: deskripsi ?? existingMission.description,
        category: kategori ?? existingMission.category,
        address: alamat ?? existingMission.address,
        latitude: updatedCoords.latitude,
        longitude: updatedCoords.longitude,
        volunteersNeeded: jumlah_relawan ?? existingMission.volunteersNeeded,
      })
      .where(eq(missions.id, missionId));

    return res.status(200).json({ message: "Misi berhasil diperbarui" });
  } catch (error: any) {
    if (error.message === "LOKASI_TIDAK_VALID") {
      return res.status(400).json({ error: "Lokasi baru tidak valid" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * 5. DELETE MISI (DELETE /api/misi/:id)
 * Soft Delete
 */
router.delete("/:id", authMiddleware, authorizeRole("pelapor"), async (req: Request, res: Response) => {
  try {
    const missionId = parseInt(req.params.id as string);

    await db.update(missions)
      .set({ isDeleted: true })
      .where(eq(missions.id, missionId));

    return res.status(200).json({ message: "Misi berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;