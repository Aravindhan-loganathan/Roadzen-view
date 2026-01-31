import { Router } from 'express';
import {
  createReport,
  getMyReports,
  getAllReports,
  updateReportStatus,
  deleteReport,
} from '../controllers/reportController';
import { authMiddleware } from '../middleware/authMiddleware';


const router = Router();

// User
router.post('/reports', authMiddleware, createReport);
router.get('/reports/my', authMiddleware, getMyReports);
router.delete('/reports/:id', authMiddleware, deleteReport);

// Admin
router.get('/admin/reports', authMiddleware, getAllReports);

router.patch(
  '/reports/:id/status',
  authMiddleware,
  updateReportStatus
);


export default router;
