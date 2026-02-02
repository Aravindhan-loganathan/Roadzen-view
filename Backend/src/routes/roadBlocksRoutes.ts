import { Router } from 'express';
import {
  getRoadblocks,
  createRoadblock,
  updateRoadblock,
  deleteRoadblock
} from '../controllers/roadBlocksController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

// Public: Get all roadblocks (authenticated users)
router.get('/roadblocks', authMiddleware, getRoadblocks);

// Admin only
router.post('/roadblocks', authMiddleware, adminOnly, createRoadblock);
router.put('/roadblocks/:id', authMiddleware, adminOnly, updateRoadblock);
router.delete('/roadblocks/:id', authMiddleware, adminOnly, deleteRoadblock);

export default router;