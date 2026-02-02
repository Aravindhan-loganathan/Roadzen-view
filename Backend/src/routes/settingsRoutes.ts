import { Router } from 'express';
import { getSystemSettings, updateSystemSettings, getUserSettings, updateUserSettings } from '../controllers/settingsController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

// System Settings (Admin only for update)
router.get('/system', authMiddleware, getSystemSettings);
router.put('/system', authMiddleware, adminOnly, updateSystemSettings);

// User Notifications/Preferences
router.get('/user', authMiddleware, getUserSettings);
router.put('/user', authMiddleware, updateUserSettings);

export default router;
