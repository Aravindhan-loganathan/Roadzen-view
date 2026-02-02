import { Router } from 'express';
import {
  getEmergencyVehicles,
  createEmergencyVehicle,
  updateEmergencyVehicle,
  deleteEmergencyVehicle,
} from '../controllers/emergencyVehicleController';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/emergency-vehicles', authMiddleware, getEmergencyVehicles);
router.post('/emergency-vehicles', authMiddleware, adminOnly, createEmergencyVehicle);
router.put('/emergency-vehicles/:id', authMiddleware, adminOnly, updateEmergencyVehicle);
router.delete('/emergency-vehicles/:id', authMiddleware, adminOnly, deleteEmergencyVehicle);

export default router;