import { Router } from 'express';
import { getSignals, updateSignal } from '../controllers/signalController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getSignals);
router.put('/:id', authMiddleware, adminOnly, updateSignal);

export default router;
