import express from 'express';
import {
  createMomoPayment,
  getMomoPaymentStatus,
  handleMomoIpn,
  listPointPackages
} from '../controllers/paymentController.js';
import { authorize, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/packages', protect, authorize('AGENT'), listPointPackages);
router.post('/momo/create', protect, authorize('AGENT'), createMomoPayment);
router.get('/momo/status/:orderId', protect, authorize('AGENT'), getMomoPaymentStatus);
router.post('/momo/ipn', handleMomoIpn);

export default router;
