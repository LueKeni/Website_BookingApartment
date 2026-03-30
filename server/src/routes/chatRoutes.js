import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  startConversation
} from '../controllers/chatController.js';
import { authorize, protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('USER', 'AGENT'));
router.post('/conversations/start', startConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);

export default router;
