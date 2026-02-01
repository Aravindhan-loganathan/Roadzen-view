import { Router } from 'express';
import { getAlerts, createAlert } from '../controllers/alertController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getAlerts);
router.post('/', authMiddleware, adminOnly, createAlert);

export default router;
