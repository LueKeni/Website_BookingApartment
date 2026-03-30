import express from 'express';
import {
  createApartment,
  deleteApartment,
  getApartmentById,
  getApartments,
  updateApartment,
  updateApartmentStatus
} from '../controllers/apartmentController.js';
import { authorize, protect } from '../middlewares/authMiddleware.js';
import { uploadApartmentImages } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.get('/', getApartments);
router.get('/:id', getApartmentById);
router.post('/', protect, authorize('AGENT', 'ADMIN'), uploadApartmentImages, createApartment);
router.put('/:id', protect, authorize('AGENT', 'ADMIN'), uploadApartmentImages, updateApartment);
router.patch('/:id/status', protect, authorize('AGENT', 'ADMIN'), updateApartmentStatus);
router.delete('/:id', protect, authorize('AGENT', 'ADMIN'), deleteApartment);

export default router;
