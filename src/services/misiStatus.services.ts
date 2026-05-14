import { db } from "../config/db";
import { missions } from "../db/schemas/missions.schema";
import { eq, and, isNull } from "drizzle-orm";

export type MissionStatus = 'menunggu_relawan' | 'relawan_terkumpul' | 'sedang_berjalan' | 'selesai';

export const VALID_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  'menunggu_relawan': ['relawan_terkumpul'],
  'relawan_terkumpul': ['sedang_berjalan', 'menunggu_relawan'], // 'menunggu_relawan' if volunteer cancels
  'sedang_berjalan': ['selesai'],
  'selesai': [],
};

export const MissionStatusEngine = {
  /**
   * Validate if a status transition is allowed.
   */
  validateTransition(currentStatus: MissionStatus, nextStatus: MissionStatus): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
  },

  /**
   * Manually update mission status with transition validation.
   */
  async updateStatus(missionId: string, nextStatus: MissionStatus, lembagaId: string) {
    const [mission] = await db
      .select()
      .from(missions)
      .where(and(eq(missions.id, missionId), isNull(missions.deletedAt)));

    if (!mission) {
      throw { status: 404, error: 'NOT_FOUND', message: 'Misi tidak ditemukan.' };
    }

    if (mission.lembagaId !== lembagaId) {
      throw { status: 403, error: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke misi ini.' };
    }

    // Explicit check for manual transitions as per CAP-81
    if (nextStatus === 'sedang_berjalan') {
      if (mission.status !== 'relawan_terkumpul') {
        throw { status: 400, error: 'Status mission belum memenuhi syarat' };
      }
    } else if (nextStatus === 'selesai') {
      if (mission.status !== 'sedang_berjalan') {
        throw { status: 400, error: 'Status mission belum memenuhi syarat' };
      }
    } else {
      // General transition validation for other cases (e.g. auto transitions)
      if (!this.validateTransition(mission.status as MissionStatus, nextStatus)) {
        throw { status: 400, error: `Transisi status dari ${mission.status} ke ${nextStatus} tidak diizinkan` };
      }
    }

    await db
      .update(missions)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(missions.id, missionId));

    return true;
  },

  /**
   * Check if a mission is still applicable.
   */
  isApplicable(status: string, applied: number, needed: number): boolean {
    if (status === 'selesai' || status === 'relawan_terkumpul' || status === 'sedang_berjalan') return false;
    return status === 'menunggu_relawan' && applied < needed;
  },

  /**
   * Status allowed for public map/listings.
   */
  getPublicStatuses(): MissionStatus[] {
    return ['menunggu_relawan', 'relawan_terkumpul', 'sedang_berjalan'];
  }
};
