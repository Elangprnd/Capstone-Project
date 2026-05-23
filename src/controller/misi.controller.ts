import { Request, Response } from "express";
import { z } from "zod";
import * as misiService from "../services/misi.services";
import { uploadMultipleToCloudinary } from "../services/upload.services";

const missionBaseSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  description: z.string().min(1, "Deskripsi wajib diisi"),
  category: z.string().min(1, "Kategori wajib diisi"),
  location: z.string().min(1, "Lokasi wajib diisi"),
  event_mode: z.enum(["offline", "online"]),
  number_of_volunteers: z.coerce.number().int().positive("Jumlah relawan harus positif"),
  contact_link: z.string().url("Link kontak harus berupa URL valid").optional().or(z.literal("")),
  coordinator_whatsapp: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  latitude: z.union([z.number(), z.string(), z.null()]).optional(),
  longitude: z.union([z.number(), z.string(), z.null()]).optional(),
  image: z.array(z.string().url()).optional(),
});

const validateDates = (data: { start_date?: string; end_date?: string }) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
};

const missionSchema = missionBaseSchema.refine(validateDates, {
  message: "end_date tidak boleh lebih awal dari start_date",
  path: ["end_date"],
});

const updateMissionSchema = missionBaseSchema.extend({
  existing_photos: z.union([
    z.string(),
    z.array(z.string())
  ]).optional().transform(val => {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  })
}).partial().refine(validateDates, {
  message: "end_date tidak boleh lebih awal dari start_date",
  path: ["end_date"],
});

export const createMissionHandler = async (req: Request, res: Response) => {
  try {
    // 1. CLEAN BODY: Trim all keys and string values to handle hidden spaces from Postman
    const cleanBody: any = {};
    Object.keys(req.body).forEach(key => {
      const trimmedKey = key.trim();
      const value = req.body[key];
      cleanBody[trimmedKey] = typeof value === 'string' ? value.trim() : value;
    });

    console.log('--- CREATE MISSION DEBUG ---');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Cleaned Body:', JSON.stringify(cleanBody, null, 2));
    
    // Process files first
    const files = req.files as Express.Multer.File[];
    let uploadedImages: string[] | undefined = undefined;

    if (files && files.length > 0) {
      const fileBuffers = files.map(file => file.buffer);
      uploadedImages = await uploadMultipleToCloudinary(fileBuffers, 'missions');
    }

    // Defensive check: if category is missing in English, check Indonesian
    if (!cleanBody.category && cleanBody.kategori) {
      cleanBody.category = cleanBody.kategori;
    }
    if (!cleanBody.title && cleanBody.judul) {
      cleanBody.title = cleanBody.judul;
    }
    if (!cleanBody.description && cleanBody.deskripsi) {
      cleanBody.description = cleanBody.deskripsi;
    }
    if (!cleanBody.location && cleanBody.alamat) {
      cleanBody.location = cleanBody.alamat;
    }
    if (!cleanBody.number_of_volunteers && cleanBody.jumlah_relawan) {
      cleanBody.number_of_volunteers = cleanBody.jumlah_relawan;
    }

    const parsedBody = missionSchema.safeParse(cleanBody);
    if (!parsedBody.success) {
      console.log('Validation failed:', JSON.stringify(parsedBody.error.flatten().fieldErrors, null, 2));
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        errors: parsedBody.error.flatten().fieldErrors,
      });
    }

    const { 
      title, description, category, location, event_mode, 
      number_of_volunteers, contact_link, coordinator_whatsapp, start_date, end_date,
      image
    } = parsedBody.data;

    const missionDataToService: any = {
      judul: title,
      deskripsi: description,
      kategori: category,
      location,
      event_mode,
      jumlah_relawan: number_of_volunteers,
      contact_link,
      coordinator_whatsapp,
      startDate: start_date ? new Date(start_date) : undefined,
      endDate: end_date ? new Date(end_date) : undefined,
      foto: image || uploadedImages,
    };

    const lembagaId = req.user!.user_id;
    const mission = await misiService.createMission(missionDataToService, lembagaId);

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
    const id = req.params.id as string;
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
    const id = req.params.id as string;
    
    // 1. CLEAN BODY: Trim all keys and string values to handle hidden spaces from Postman
    const cleanBody: any = {};
    Object.keys(req.body).forEach(key => {
      const trimmedKey = key.trim();
      const value = req.body[key];
      cleanBody[trimmedKey] = typeof value === 'string' ? value.trim() : value;
    });

    // Process files first
    const files = req.files as Express.Multer.File[];
    let uploadedImages: string[] | undefined = undefined;

    if (files && files.length > 0) {
      const fileBuffers = files.map(file => file.buffer);
      uploadedImages = await uploadMultipleToCloudinary(fileBuffers, 'missions');
    }

    // Defensive check: if category is missing in English, check Indonesian
    if (!cleanBody.category && cleanBody.kategori) {
      cleanBody.category = cleanBody.kategori;
    }
    if (!cleanBody.title && cleanBody.judul) {
      cleanBody.title = cleanBody.judul;
    }
    if (!cleanBody.description && cleanBody.deskripsi) {
      cleanBody.description = cleanBody.deskripsi;
    }
    if (!cleanBody.location && cleanBody.alamat) {
      cleanBody.location = cleanBody.alamat;
    }
    if (!cleanBody.number_of_volunteers && cleanBody.jumlah_relawan) {
      cleanBody.number_of_volunteers = cleanBody.jumlah_relawan;
    }

    console.log('--- UPDATE MISSION DEBUG ---');
    console.log('Cleaned Body:', JSON.stringify(cleanBody, null, 2));

    const parsedBody = updateMissionSchema.safeParse(cleanBody);
    if (!parsedBody.success) {
      console.log('--- UPDATE MISSION VALIDATION ERROR ---');
      console.log('Errors:', JSON.stringify(parsedBody.error.flatten().fieldErrors, null, 2));
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        errors: parsedBody.error.flatten().fieldErrors,
      });
    }

    const { 
      title, description, category, location, event_mode, 
      number_of_volunteers, contact_link, coordinator_whatsapp, start_date, end_date,
      latitude, longitude,
      image, existing_photos
    } = parsedBody.data;

    const missionData: any = {
      ...(title && { judul: title }),
      ...(description && { deskripsi: description }),
      ...(category && { kategori: category }),
      ...(location && { location }),
      ...(event_mode && { event_mode }),
      ...(number_of_volunteers && { jumlah_relawan: number_of_volunteers }),
      ...(contact_link !== undefined && { contact_link }),
      ...(coordinator_whatsapp !== undefined && { coordinator_whatsapp }),
      ...(start_date && { startDate: new Date(start_date) }),
      ...(end_date && { endDate: new Date(end_date) }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...((image || uploadedImages) && { foto: image || uploadedImages }),
      existing_photos // Array of photo URLs to keep
    };

    console.log('Mission Data to Service:', JSON.stringify(missionData, null, 2));

    const lembagaId = req.user!.user_id;
    await misiService.updateMission(id, missionData, lembagaId);

    res.status(200).json({ message: "Misi berhasil diperbarui" });
  } catch (error: any) {
    if (error.message === "MISI_TIDAK_DITEMUKAN") {
      return res.status(404).json({ error: "Misi tidak ditemukan" });
    }
    if (error.message === "TIDAK_DIIZINKAN") {
      return res.status(403).json({ error: "Anda tidak memiliki akses untuk memperbarui misi ini" });
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
    const id = req.params.id as string;

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
      status: z.enum(["berjalan", "selesai"]),
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
    const id = req.params.id as string;
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
