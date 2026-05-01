import { Router } from 'express'
import * as authController from '../../controller/auth.controller'
import { loginRateLimiter } from '../../middlewares/rateLimiter'

const router = Router()


// Sudah pakai controller
router.post('/register/volunteer', authController.registerVolunteerHandler)
router.post('/register/lembaga', authController.registerLembagaHandler)
router.post('/login', loginRateLimiter, authController.loginHandler)
router.post('/logout', authController.logoutHandler)
router.post('/google', authController.googleAuthHandler)
router.post('/forgot-password', authController.forgotPasswordHandler)
router.post('/reset-password', authController.resetPasswordHandler)

export default router