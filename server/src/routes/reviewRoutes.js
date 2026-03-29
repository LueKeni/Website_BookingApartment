import express from 'express';
import { createReview, getAgentReviews } from '../controllers/reviewController.js';
import { authorize, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('USER'), createReview);
router.get('/agent/:agentId', getAgentReviews);

export default router;
