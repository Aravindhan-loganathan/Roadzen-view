import { Router } from 'express';
import { register, login, updateProfile, getProfile, changePassword, getAllUsers } from '../controllers/authController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Protected user routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

// Admin only routes
router.get('/admin/users', authMiddleware, adminOnly, getAllUsers);

export default router;
