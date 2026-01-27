import { Router } from 'express';
import { getDashboardSummary, getHourlyTraffic } from '../controllers/dashboardController';

const router = Router();

router.get('/summary', getDashboardSummary);
router.get('/hourly', getHourlyTraffic);

export default router;
