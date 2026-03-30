import express from 'express';
import {
	getProfile,
	getPublicAgentProfile,
	getUsers,
	toggleFavoriteApartment,
	toggleUserStatus,
	updateProfile,
	updateUserRole
} from '../controllers/userController.js';
import { authorize, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/agents/:id/profile', getPublicAgentProfile);
router.get('/', protect, authorize('ADMIN'), getUsers);
router.get('/profile', protect, authorize('USER', 'AGENT'), getProfile);
router.put('/profile', protect, authorize('USER', 'AGENT'), updateProfile);
router.post('/favorites', protect, authorize('USER'), toggleFavoriteApartment);
router.patch('/:id/status', protect, authorize('ADMIN'), toggleUserStatus);
router.patch('/:id/role', protect, authorize('ADMIN'), updateUserRole);

export default router;
