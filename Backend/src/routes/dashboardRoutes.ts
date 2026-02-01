import { Router } from 'express';
import { getDashboardSummary, getHourlyTraffic } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/summary', authMiddleware, getDashboardSummary);
router.get('/hourly', authMiddleware, getHourlyTraffic);

export default router;
