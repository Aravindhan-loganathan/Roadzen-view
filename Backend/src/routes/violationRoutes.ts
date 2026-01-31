import { Router } from 'express';
import {
  createViolation,
  getViolations,
  getViolationById,
  updateViolation,
  deleteViolation,
  getLocations,
} from '../controllers/violationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get all unique locations/junctions
router.get('/violations/locations/list', authMiddleware, getLocations);

// Get all violations (with filters)
router.get('/violations', authMiddleware, getViolations);

// Get a specific violation by ID
router.get('/violations/:id', authMiddleware, getViolationById);

// Create a new violation (Admin only)
router.post('/violations', authMiddleware, createViolation);

// Update a violation
router.patch('/violations/:id', authMiddleware, updateViolation);

// Delete a violation
router.delete('/violations/:id', authMiddleware, deleteViolation);

export default router;
