import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    apartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment', required: true },
    lastMessage: { type: String, default: '' }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, apartmentId: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
