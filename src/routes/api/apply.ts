import { Router } from 'express'
import * as applyController from '../../controller/apply.controller'
import { authenticate, authorize } from '../../middlewares/authMiddleware'

const router = Router()

// GET riwayat apply milik relawan yang login
// Guard 1 (authenticate) + Guard role (authorize volunteer only)
router.get(
  '/me',
  authenticate,                    // Cek JWT valid
  authorize('volunteer'),          // Cek role = volunteer (CAP-68: lembaga → 403)
  applyController.getMyApplicationsHandler
)




// opsional belum terlalu dipake
// POST apply ke misi
// Guard 1 sudah di-handle oleh middleware di sini
router.post(
  '/:application_id/approve',
  authenticate,
  authorize('lembaga'),
  (req, res) => res.status(200).json({ message: 'approve endpoint - coming soon' })
)

router.patch(
  '/:application_id/reject',
  authenticate,
  authorize('lembaga'),
  (req, res) => res.status(200).json({ message: 'reject endpoint - coming soon' })
)

// DELETE batalkan apply (hanya jika masih pending)
router.delete(
  '/:id',
  authenticate,
  authorize('volunteer'),
  (req, res) => res.status(200).json({ message: 'cancel apply endpoint - coming soon' })
)

export default router