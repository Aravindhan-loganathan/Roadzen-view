import { Router } from 'express';
import { register, login, updateProfile, getProfile, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.put('/profile', authenticateToken, authMiddleware, updateProfile);
router.put('/profile', authenticateToken, updateProfile);
router.get('/profile', authenticateToken, getProfile);
router.put('/change-password', authenticateToken, changePassword);

export default router;
