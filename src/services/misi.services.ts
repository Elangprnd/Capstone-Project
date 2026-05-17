import { db } from "../config/db";
import { missions, Mission, NewMission } from "../db/schemas/missions.schema";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";
import { getCoordinates } from "./geocoding.services";
import { MissionStatusEngine, MissionStatus } from "./misiStatus.services";

export const createMission = async (data: any, lembagaId: string) => {
  const { judul, deskripsi, kategori, alamat, jumlah_relawan, foto } = data;

  // Geocoding
  const coords = await getCoordinates(alamat);

  // Map kategori to schema enum
  const categoryMap: Record<string, any> = {
    "Bencana": "tanggap_bencana",
    "Pendidikan": "pendidikan",
    "Medis": "medis",
    "Logistik": "logistik",
  };

  const dbCategory = categoryMap[kategori] || "tanggap_bencana";

  const newMission: NewMission = {
    lembagaId,
    title: judul,
    description: deskripsi,
    category: dbCategory,
    address: alamat,
    latitude: coords.latitude.toString(),
    longitude: coords.longitude.toString(),
    volunteersNeeded: jumlah_relawan,
    photos: foto,
  };

  const [result] = await db.insert(missions).values(newMission).returning({ id: missions.id });
  return result;
};

export const getAllMissions = async (filters: {
  lat?: number;
  lng?: number;
  radius?: number;
  kategori?: string;
}) => {
  const { lat, lng, radius, kategori } = filters;

  const conditions = [
    isNull(missions.deletedAt),
    inArray(missions.status, MissionStatusEngine.getPublicStatuses())
  ];

  // Filter by category
  if (kategori) {
    const categoryMap: Record<string, any> = {
      "Bencana": "tanggap_bencana",
      "Pendidikan": "pendidikan",
      "Medis": "medis",
      "Logistik": "logistik",
    };
    const dbCategory = categoryMap[kategori] || kategori;
    conditions.push(eq(sql`LOWER(${missions.category})`, dbCategory.toLowerCase()));
  }

  const allMissions = await db.select().from(missions).where(and(...conditions));

  // Filter by radius if provided
  let filtered = allMissions;
  if (lat && lng && radius) {
    filtered = allMissions.filter((m) => {
      const distance = calculateDistance(
        lat,
        lng,
        parseFloat(m.latitude),
        parseFloat(m.longitude)
      );
      return distance <= radius;
    });
  }

  // Map back to response format
  const reverseCategoryMap: Record<string, string> = {
    "tanggap_bencana": "Bencana",
    "pendidikan": "Pendidikan",
    "medis": "Medis",
    "logistik": "Logistik",
  };

  const statusMap: Record<string, string> = {
    "menunggu_relawan": "Open",
    "sedang_berjalan": "In Progress",
    "relawan_terkumpul": "Full",
    "selesai": "Completed",
  };

  return filtered.map((m) => ({
    id: m.id,
    judul: m.title,
    kategori: reverseCategoryMap[m.category] || m.category,
    latitude: parseFloat(m.latitude),
    longitude: parseFloat(m.longitude),
    status: statusMap[m.status] || m.status,
    jumlah_relawan: m.volunteersNeeded,
  }));
};

export const getMissionById = async (id: string) => {
  const [mission] = await db
    .select()
    .from(missions)
    .where(and(eq(missions.id, id), isNull(missions.deletedAt)));

  if (!mission) return null;

  const reverseCategoryMap: Record<string, string> = {
    "tanggap_bencana": "Bencana",
    "pendidikan": "Pendidikan",
    "medis": "Medis",
    "logistik": "Logistik",
  };

  const statusMap: Record<string, string> = {
    "menunggu_relawan": "Open",
    "sedang_berjalan": "In Progress",
    "relawan_terkumpul": "Full",
    "selesai": "Completed",
  };

  return {
    ...mission,
    kategori: reverseCategoryMap[mission.category] || mission.category,
    status: statusMap[mission.status] || mission.status,
    latitude: parseFloat(mission.latitude),
    longitude: parseFloat(mission.longitude),
  };
};

export const getMissionsByLembagaId = async (lembagaId: string) => {
  const allMissions = await db
    .select()
    .from(missions)
    .where(and(eq(missions.lembagaId, lembagaId), isNull(missions.deletedAt)));

  const reverseCategoryMap: Record<string, string> = {
    "tanggap_bencana": "Bencana",
    "pendidikan": "Pendidikan",
    "medis": "Medis",
    "logistik": "Logistik",
  };

  const statusMap: Record<string, string> = {
    "menunggu_relawan": "Open",
    "sedang_berjalan": "In Progress",
    "relawan_terkumpul": "Full",
    "selesai": "Completed",
  };

  return allMissions.map((m) => ({
    ...m,
    kategori: reverseCategoryMap[m.category] || m.category,
    status: statusMap[m.status] || m.status,
    latitude: parseFloat(m.latitude),
    longitude: parseFloat(m.longitude),
  }));
};

export const updateMission = async (id: string, data: any) => {
  const { judul, deskripsi, kategori, alamat, jumlah_relawan, foto } = data;

  const [existing] = await db.select().from(missions).where(eq(missions.id, id));
  if (!existing) throw new Error("MISI_TIDAK_DITEMUKAN");

  let latitude = existing.latitude;
  let longitude = existing.longitude;

  if (alamat && alamat !== existing.address) {
    const coords = await getCoordinates(alamat);
    latitude = coords.latitude.toString();
    longitude = coords.longitude.toString();
  }

  const categoryMap: Record<string, any> = {
    "Bencana": "tanggap_bencana",
    "Pendidikan": "pendidikan",
    "Medis": "medis",
    "Logistik": "logistik",
  };

  const updateData: any = {
    ...(judul && { title: judul }),
    ...(deskripsi && { description: deskripsi }),
    ...(kategori && { category: categoryMap[kategori] || kategori }),
    ...(alamat && { address: alamat, latitude, longitude }),
    ...(jumlah_relawan && { volunteersNeeded: jumlah_relawan }),
    ...(foto && { photos: foto }),
    updatedAt: new Date(),
  };

  const [updated] = await db
    .update(missions)
    .set(updateData)
    .where(eq(missions.id, id))
    .returning();

  return updated;
};

export const updateMissionStatus = async (id: string, nextStatus: MissionStatus, lembagaId: string) => {
  return await MissionStatusEngine.updateStatus(id, nextStatus, lembagaId);
};

export const deleteMission = async (id: string) => {
  const [existing] = await db.select().from(missions).where(eq(missions.id, id));
  if (!existing) throw new Error("MISI_TIDAK_DITEMUKAN");

  await db
    .update(missions)
    .set({ deletedAt: new Date() })
    .where(eq(missions.id, id));
  
  return true;
};

// Helper for distance calculation (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
