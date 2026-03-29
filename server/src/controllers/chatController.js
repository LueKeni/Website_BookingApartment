import mongoose from 'mongoose';
import Apartment from '../models/Apartment.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const isParticipant = (conversation, userId) => {
  return conversation.participants.some((item) => item.toString() === userId);
};

const startConversation = async (req, res) => {
  try {
    const { apartmentId, agentId } = req.body;

    if (!apartmentId || !agentId) {
      return res.status(400).json({ success: false, message: 'apartmentId and agentId are required' });
    }

    const apartment = await Apartment.findById(apartmentId).select('agentId');
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (apartment.agentId.toString() !== agentId) {
      return res.status(400).json({ success: false, message: 'agentId does not match apartment' });
    }

    const participantIds = [req.user.id, agentId].map((id) => new mongoose.Types.ObjectId(id));

    let conversation = await Conversation.findOne({
      apartmentId,
      participants: { $all: participantIds }
    })
      .populate('participants', 'fullName role avatar')
      .populate('apartmentId', 'title images location');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: participantIds,
        apartmentId,
        lastMessage: ''
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'fullName role avatar')
        .populate('apartmentId', 'title images location');
    }

    return res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate('participants', 'fullName role avatar')
      .populate('apartmentId', 'title images location')
      .sort({ updatedAt: -1 });

    const list = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conversation._id,
          senderId: { $ne: req.user.id },
          isRead: false
        });

        return {
          ...conversation.toObject(),
          unreadCount
        };
      })
    );

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 30), 50);
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const messages = await Message.find({ conversationId: id })
      .populate('senderId', 'fullName role avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    await Message.updateMany(
      { conversationId: id, senderId: { $ne: req.user.id }, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      success: true,
      data: messages.reverse(),
      pagination: { page, limit, hasMore: messages.length === limit }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'text is required' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const message = await Message.create({
      conversationId: id,
      senderId: req.user.id,
      text,
      isRead: false
    });

    conversation.lastMessage = text;
    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate('senderId', 'fullName role avatar');

    return res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { getConversations, getMessages, sendMessage, startConversation };
