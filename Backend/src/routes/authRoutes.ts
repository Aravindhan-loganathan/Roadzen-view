import { Router } from 'express';
import { register, login, updateProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.put('/profile', authenticateToken, authMiddleware, updateProfile);

export default router;
