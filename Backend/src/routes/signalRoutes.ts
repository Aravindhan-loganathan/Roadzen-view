import { Router } from 'express';
import { getSignals, updateSignal } from '../controllers/signalController';

const router = Router();

router.get('/', getSignals);
router.put('/:id', updateSignal);

export default router;
