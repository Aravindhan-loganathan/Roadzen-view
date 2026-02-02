import { Router } from 'express';
import { getSignals, updateSignal, createSignal, deleteSignal } from '../controllers/signalController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getSignals);
router.post('/', authMiddleware, adminOnly, createSignal);
router.put('/:id', authMiddleware, adminOnly, updateSignal);
router.delete('/:id', authMiddleware, adminOnly, deleteSignal);

export default router;
