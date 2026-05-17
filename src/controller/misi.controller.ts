import { Request, Response } from "express";
import { z } from "zod";
import * as misiService from "../services/misi.services";
import { uploadMultipleToCloudinary } from "../services/upload.services";

const missionSchema = z.object({
  judul: z.string().min(1, "Judul wajib diisi"),
  deskripsi: z.string().min(1, "Deskripsi wajib diisi"),
  kategori: z.string().min(1, "Kategori wajib diisi"),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  jumlah_relawan: z.coerce.number().int().positive("Jumlah relawan harus positif"),
  foto: z.array(z.string().url()).optional(),
});

const updateMissionSchema = missionSchema.partial();

export const createMissionHandler = async (req: Request, res: Response) => {
  try {
    const parsedBody = missionSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        errors: parsedBody.error.flatten().fieldErrors,
      });
    }

    const missionData = parsedBody.data;
    const files = req.files as Express.Multer.File[];

    if (files && files.length > 0) {
      const fileBuffers = files.map(file => file.buffer);
      const imageUrls = await uploadMultipleToCloudinary(fileBuffers, 'missions');
      missionData.foto = imageUrls;
    }

    const lembagaId = req.user!.user_id;
    const mission = await misiService.createMission(missionData, lembagaId);

    res.status(201).json({
      id: mission.id,
      message: "Misi berhasil dibuat",
    });
  } catch (error: any) {
    if (error.message === "LOKASI_TIDAK_VALID") {
      return res.status(400).json({ error: "Lokasi tidak valid" });
    }
    console.error("Create mission error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllMissionsHandler = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, kategori } = req.query;

    const missions = await misiService.getAllMissions({
      lat: lat ? parseFloat(lat as string) : undefined,
      lng: lng ? parseFloat(lng as string) : undefined,
      radius: radius ? parseFloat(radius as string) : undefined,
      kategori: kategori as string,
    });

    res.status(200).json(missions);
  } catch (error) {
    console.error("Get all missions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMissionDetailHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mission = await misiService.getMissionById(id);

    if (!mission) {
      return res.status(404).json({ error: "Misi tidak ditemukan" });
    }

    res.status(200).json(mission);
  } catch (error) {
    console.error("Get mission detail error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMissionHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsedBody = updateMissionSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        errors: parsedBody.error.flatten().fieldErrors,
      });
    }

    const missionData = parsedBody.data;
    const files = req.files as Express.Multer.File[];

    if (files && files.length > 0) {
      const fileBuffers = files.map(file => file.buffer);
      const imageUrls = await uploadMultipleToCloudinary(fileBuffers, 'missions');
      missionData.foto = imageUrls;
    }

    await misiService.updateMission(id, missionData);

    res.status(200).json({ message: "Misi berhasil diperbarui" });
  } catch (error: any) {
    if (error.message === "MISI_TIDAK_DITEMUKAN") {
      return res.status(404).json({ error: "Misi tidak ditemukan" });
    }
    if (error.message === "LOKASI_TIDAK_VALID") {
      return res.status(400).json({ error: "Lokasi tidak valid" });
    }
    console.error("Update mission error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMissionStatusHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID as UUID
    const idSchema = z.string().uuid({ message: "Format ID misi tidak valid" });
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        errors: { id: parsedId.error.flatten().formErrors },
      });
    }

    const statusSchema = z.object({
      status: z.enum(["berjalan", "selesai"], {
        errorMap: () => ({ message: "Status harus 'berjalan' atau 'selesai'" }),
      }),
    });

    const parsedBody = statusSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Payload tidak valid",
        errors: {
          ...parsedBody.error.flatten().fieldErrors,
          _form: parsedBody.error.flatten().formErrors,
        },
      });
    }

    const statusMap: Record<string, any> = {
      berjalan: "sedang_berjalan",
      selesai: "selesai",
    };

    const lembagaId = req.user!.user_id;
    await misiService.updateMissionStatus(id, statusMap[parsedBody.data.status], lembagaId);

    res.status(200).json({ message: "Status misi berhasil diperbarui" });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.error, message: error.message });
    }
    console.error("Update mission status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMyMissionsHandler = async (req: Request, res: Response) => {
  try {
    const lembagaId = req.user!.user_id;
    const missions = await misiService.getMissionsByLembagaId(lembagaId);
    res.status(200).json(missions);
  } catch (error) {
    console.error("Get my missions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMissionHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await misiService.deleteMission(id);
    res.status(200).json({ message: "Misi berhasil dihapus" });
  } catch (error: any) {
    if (error.message === "MISI_TIDAK_DITEMUKAN") {
      return res.status(404).json({ error: "Misi tidak ditemukan" });
    }
    console.error("Delete mission error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
