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
router.get('/locations/list', authMiddleware, getLocations);
router.get('/', authMiddleware, getViolations);
router.get('/:id', authMiddleware, getViolationById);

// Admin only operations
router.post('/', authMiddleware, adminOnly, createViolation);
router.patch('/:id', authMiddleware, adminOnly, updateViolation);
router.delete('/:id', authMiddleware, adminOnly, deleteViolation);

export default router;
