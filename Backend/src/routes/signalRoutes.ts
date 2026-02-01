import { Router } from 'express';
import { getSignals, updateSignal, createSignal, deleteSignal } from '../controllers/signalController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/signals', authMiddleware, getSignals);
router.post('/signals', authMiddleware, adminOnly, createSignal);
router.put('/signals/:id', authMiddleware, adminOnly, updateSignal);
router.delete('/signals/:id', authMiddleware, adminOnly, deleteSignal);

export default router;
