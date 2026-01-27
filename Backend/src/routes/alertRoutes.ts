import { Router } from 'express';
import { getAlerts, createAlert } from '../controllers/alertController';

const router = Router();

router.get('/', getAlerts);
router.post('/', createAlert);

export default router;
