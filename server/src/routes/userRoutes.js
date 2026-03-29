import express from 'express';
import {
	getProfile,
	getUsers,
	toggleFavoriteApartment,
	toggleUserStatus,
	updateProfile
} from '../controllers/userController.js';
import { authorize, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize('ADMIN'), getUsers);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/favorites', protect, authorize('USER'), toggleFavoriteApartment);
router.patch('/:id/status', protect, authorize('ADMIN'), toggleUserStatus);

export default router;
