import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
	{
		customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
		rating: { type: Number, required: true, min: 1, max: 5 },
		comment: { type: String, trim: true }
	},
	{ timestamps: true }
);

const Review = mongoose.model('Review', reviewSchema);

export default Review;
