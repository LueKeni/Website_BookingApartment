import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
	{
		customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		apartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment', required: true },
		scheduledDate: { type: Date, required: true },
		scheduledTime: { type: String, required: true, trim: true },
		status: {
			type: String,
			enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
			default: 'PENDING'
		},
		customerNote: { type: String, trim: true },
		cancelReason: { type: String, trim: true }
	},
	{ timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
