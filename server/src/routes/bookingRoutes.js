import express from 'express';
import {
  createBooking,
  getMyBookings,
  updateBookingStatus
} from '../controllers/bookingController.js';
import { authorize, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('USER'), createBooking);
router.get('/me', protect, authorize('USER', 'AGENT', 'ADMIN'), getMyBookings);
router.patch('/:id/status', protect, authorize('AGENT', 'ADMIN'), updateBookingStatus);

export default router;
