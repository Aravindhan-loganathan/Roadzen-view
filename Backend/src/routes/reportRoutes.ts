import { Router } from 'express';
import {
  createReport,
  getMyReports,
  getAllReports,
  updateReportStatus,
  deleteReport,
} from '../controllers/reportController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';


const router = Router();

// User routes
router.post('/', authMiddleware, createReport);
router.get('/my', authMiddleware, getMyReports);
router.delete('/:id', authMiddleware, deleteReport);

// Admin routes
router.get('/admin', authMiddleware, adminOnly, getAllReports);
router.patch('/:id/status', authMiddleware, adminOnly, updateReportStatus);


export default router;
