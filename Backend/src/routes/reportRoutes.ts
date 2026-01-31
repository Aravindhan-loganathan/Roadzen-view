import { Router } from 'express';
import {
  createReport,
  getMyReports,
  getAllReports,
} from '../controllers/reportController';
import { authMiddleware } from '../middleware/authMiddleware';


const router = Router();

// User
router.post('/reports', authMiddleware, createReport);
router.get('/reports/my', authMiddleware, getMyReports);

// Admin
router.get('/admin/reports', authMiddleware, getAllReports);
import { markReportInProgress } from '../controllers/reportController';

router.patch(
  '/admin/reports/:id/handle',
  authMiddleware,
  markReportInProgress
);


export default router;
