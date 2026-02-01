import { Router } from 'express';
import {
  createViolation,
  getViolations,
  getViolationById,
  updateViolation,
  deleteViolation,
  getLocations,
} from '../controllers/violationController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

// Read operations (all authenticated users)
router.get('/violations/locations/list', authMiddleware, getLocations);
router.get('/violations', authMiddleware, getViolations);
router.get('/violations/:id', authMiddleware, getViolationById);

// Admin only operations
router.post('/violations', authMiddleware, adminOnly, createViolation);
router.patch('/violations/:id', authMiddleware, adminOnly, updateViolation);
router.delete('/violations/:id', authMiddleware, adminOnly, deleteViolation);

export default router;
