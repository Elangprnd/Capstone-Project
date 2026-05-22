import { db } from "../config/db";
import { missions, Mission, NewMission } from "../db/schemas/missions.schema";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";
import { getCoordinates } from "./geocoding.services";
import { MissionStatusEngine, MissionStatus } from "./misiStatus.services";

export const createMission = async (data: any, lembagaId: string) => {
  const { 
    judul, deskripsi, kategori, location, jumlah_relawan, 
    foto, event_mode, contact_link, coordinator_whatsapp, startDate, endDate 
  } = data;

  let latitude: string | null = null;
  let longitude: string | null = null;

  // Geocoding logic based on event_mode
  if (event_mode === 'offline') {
    const coords = await getCoordinates(location);
    latitude = coords.latitude ? coords.latitude.toString() : null;
    longitude = coords.longitude ? coords.longitude.toString() : null;
  } else if (event_mode === 'online') {
    // Optional geocoding for online, but recommended to skip
    latitude = null;
    longitude = null;
  }

  // Map kategori to schema enum
  const categoryMap: Record<string, any> = {
    "Bencana": "tanggap_bencana",
    "Pendidikan": "pendidikan",
    "Medis": "medis",
    "Logistik": "logistik",
  };

  const dbCategory = categoryMap[kategori] || kategori;

  const newMission: NewMission = {
    lembagaId,
    title: judul,
    description: deskripsi,
    category: dbCategory,
    eventMode: event_mode,
    location: location,
    latitude,
    longitude,
    startDate,
    endDate,
    contactLink: contact_link,
    coordinatorWhatsapp: coordinator_whatsapp,
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
      // Only include missions where latitude and longitude are NOT NULL
      if (m.latitude === null || m.longitude === null) return false;
      
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
    title: m.judul || m.title, // Handle both for safety
    category: reverseCategoryMap[m.category] || m.category,
    location: m.location,
    latitude: m.latitude ? parseFloat(m.latitude) : null,
    longitude: m.longitude ? parseFloat(m.longitude) : null,
    event_mode: m.eventMode,
    status: statusMap[m.status] || m.status,
    number_of_volunteers: m.volunteersNeeded,
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
    id: mission.id,
    title: mission.title,
    description: mission.description,
    category: reverseCategoryMap[mission.category] || mission.category,
    event_mode: mission.eventMode,
    location: mission.location,
    latitude: mission.latitude ? parseFloat(mission.latitude) : null,
    longitude: mission.longitude ? parseFloat(mission.longitude) : null,
    start_date: mission.startDate,
    end_date: mission.endDate,
    contact_link: mission.contactLink,
    number_of_volunteers: mission.volunteersNeeded,
    volunteers_applied: mission.volunteersApplied,
    photos: mission.photos,
    status: statusMap[mission.status] || mission.status,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
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
    id: m.id,
    title: m.title,
    description: m.description,
    category: reverseCategoryMap[m.category] || m.category,
    event_mode: m.eventMode,
    location: m.location,
    latitude: m.latitude ? parseFloat(m.latitude) : null,
    longitude: m.longitude ? parseFloat(m.longitude) : null,
    start_date: m.startDate,
    end_date: m.endDate,
    contact_link: m.contactLink,
    number_of_volunteers: m.volunteersNeeded,
    volunteers_applied: m.volunteersApplied,
    photos: m.photos,
    status: statusMap[m.status] || m.status,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
};

export const updateMission = async (id: string, data: any) => {
  const { 
    judul, deskripsi, kategori, location, jumlah_relawan, 
    foto, event_mode, contact_link, coordinator_whatsapp, startDate, endDate 
  } = data;

  const [existing] = await db.select().from(missions).where(eq(missions.id, id));
  if (!existing) throw new Error("MISI_TIDAK_DITEMUKAN");

  let latitude = existing.latitude;
  let longitude = existing.longitude;
  const currentEventMode = event_mode || existing.eventMode;
  const currentLocation = location || existing.location;

  // Re-run geocoding if:
  // 1. location changes AND event_mode is offline
  // 2. event_mode changes from online to offline
  const locationChanged = location && location !== existing.location;
  const modeChangedToOffline = event_mode === 'offline' && existing.eventMode === 'online';
  
  if ((locationChanged && currentEventMode === 'offline') || modeChangedToOffline) {
    const coords = await getCoordinates(currentLocation);
    latitude = coords.latitude ? coords.latitude.toString() : null;
    longitude = coords.longitude ? coords.longitude.toString() : null;
  } else if (event_mode === 'online' && existing.eventMode === 'offline') {
    // If changing from offline to online, we can nullify coordinates
    latitude = null;
    longitude = null;
  }

  const categoryMap: Record<string, any> = {
    "Bencana": "tanggap_bencana",
    "Pendidikan": "pendidikan",
    "Medis": "medis",
    "Logistik": "logistik",
  };

  // Update basic info
  const updateData: any = {
    ...(judul && { title: judul }),
    ...(deskripsi && { description: deskripsi }),
    ...(kategori && { category: categoryMap[kategori] || kategori }),
    ...(location && { location }),
    ...(event_mode && { eventMode: event_mode }),
    ...(contact_link !== undefined && { contactLink: contact_link }),
    ...(coordinator_whatsapp !== undefined && { coordinatorWhatsapp: coordinator_whatsapp }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    // Prioritize passed-in coordinates (e.g. from frontend map/search) over geocoding
    latitude: data.latitude !== undefined ? data.latitude : latitude,
    longitude: data.longitude !== undefined ? data.longitude : longitude,
    ...(jumlah_relawan && { volunteersNeeded: jumlah_relawan }),
    updatedAt: new Date(),
  };

  // Handle photos: Merge kept existing photos with newly uploaded photos
  const photosToKeep = data.existing_photos || [];
  const newPhotos = foto || [];
  const mergedPhotos = [...photosToKeep, ...newPhotos];

  if (mergedPhotos.length > 0 || (data.existing_photos !== undefined)) {
    updateData.photos = mergedPhotos;
  }

  await db.update(missions).set(updateData).where(eq(missions.id, id));
  return true;
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
