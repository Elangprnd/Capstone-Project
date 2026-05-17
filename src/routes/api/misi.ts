import { Router } from 'express'
import { authenticate, authorize } from '../../middlewares/authMiddleware'
import * as misiController from '../../controller/misi.controller'
import * as applyController from '../../controller/apply.controller'
import { upload } from '../../middlewares/upload'

const router = Router()

// Public routes
router.get('/', misiController.getAllMissionsHandler)
router.get('/:id', misiController.getMissionDetailHandler)

// Protected routes (Lembaga/Pelapor only)
router.post('/', authenticate, authorize('lembaga'), upload.array('foto'), misiController.createMissionHandler)
router.put('/:id', authenticate, authorize('lembaga'), upload.array('foto'), misiController.updateMissionHandler)
router.delete('/:id', authenticate, authorize('lembaga'), misiController.deleteMissionHandler)
router.get('/pelapor/me', authenticate, authorize('lembaga'), misiController.getMyMissionsHandler)
router.patch('/:id/status', authenticate, authorize('lembaga'), upload.none(), misiController.updateMissionStatusHandler)

// CAP-80: GET /api/misi/:id/applicants
router.get('/:id/applicants', authenticate, authorize('lembaga'), applyController.getApplicantsHandler)

// Apply mission (Volunteer only) - Keep existing for compatibility
router.post('/:mission_id/apply', authenticate, authorize('volunteer'), applyController.applyMissionHandler)

export default router
