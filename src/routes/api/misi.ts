import { Router } from 'express'
import { authenticate, authorize } from '../../middlewares/authMiddleware'
import * as applyController from '../../controller/apply.controller'

const router = Router()

// Endpoint apply ada di bawah /missions/:mission_id/apply
// Guard 1: authenticate (cek JWT)
// Guard role: authorize('volunteer') — lembaga tidak boleh apply (CAP-64)
router.post('/:mission_id/apply', authenticate, authorize('volunteer'), applyController.applyMissionHandler)





// ... endpoint misi lainnya (dummy atau sudah ada)
router.get('/', (req, res) => {
  res.status(200).json({ message: 'get all misi endpoint' })
})

router.get('/pelapor/me', authenticate, authorize('lembaga'), (req, res) => {
  res.status(200).json({ message: 'get my misi pelapor endpoint' })
})

router.get('/:id', (req, res) => {
  res.status(200).json({ message: `get misi detail id: ${req.params.id}` })
})

router.post('/', authenticate, authorize('lembaga'), (req, res) => {
  res.status(200).json({ message: 'create misi endpoint' })
})

router.put('/:id', authenticate, authorize('lembaga'), (req, res) => {
  res.status(200).json({ message: `update misi id: ${req.params.id}` })
})

router.patch('/:id/status', authenticate, authorize('lembaga'), (req, res) => {
  res.status(200).json({ message: `update status misi id: ${req.params.id}` })
})

router.delete('/:id', authenticate, (req, res) => {
  res.status(200).json({ message: `delete misi id: ${req.params.id}` })
})

router.get('/:id/applicants', authenticate, authorize('lembaga'), (req, res) => {
  res.status(200).json({ message: `get applicants misi id: ${req.params.id}` })
})

export default router