import Booking from '../models/Booking.js';
import Review from '../models/Review.js';

const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || typeof rating === 'undefined') {
      return res.status(400).json({ success: false, message: 'bookingId and rating are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Review is allowed only for completed bookings' });
    }

    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Review already exists for this booking' });
    }

    const review = await Review.create({
      customerId: req.user.id,
      agentId: booking.agentId,
      bookingId,
      rating,
      comment
    });

    return res.status(201).json({ success: true, message: 'Review created', data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAgentReviews = async (req, res) => {
  try {
    const { agentId } = req.params;
    const reviews = await Review.find({ agentId })
      .populate('customerId', 'fullName avatar')
      .populate('bookingId', 'scheduledDate scheduledTime status')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { createReview, getAgentReviews };
