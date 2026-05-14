import { Router } from 'express'
import * as applyController from '../../controller/apply.controller'
import { authenticate, authorize } from '../../middlewares/authMiddleware'

const router = Router()

// CAP-80: GET /api/apply/me
router.get(
  '/me',
  authenticate,
  authorize('volunteer'),
  applyController.getMyApplicationsHandler
)

// CAP-80: POST /api/apply
router.post(
  '/',
  authenticate,
  authorize('volunteer'),
  applyController.applyMissionHandler
)

// CAP-80: PATCH /api/apply/:id/approve
router.patch(
  '/:id/approve',
  authenticate,
  authorize('lembaga'),
  applyController.approveApplicationHandler
)

// CAP-80: PATCH /api/apply/:id/reject
router.patch(
  '/:id/reject',
  authenticate,
  authorize('lembaga'),
  applyController.rejectApplicationHandler
)

// CAP-80: DELETE /api/apply/:id - Cancel Apply
router.delete(
  '/:id',
  authenticate,
  authorize('volunteer'),
  applyController.cancelApplicationHandler
)

export default router
