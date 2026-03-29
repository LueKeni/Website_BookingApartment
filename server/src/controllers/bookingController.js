import Apartment from '../models/Apartment.js';
import Booking from '../models/Booking.js';

const createBooking = async (req, res) => {
  try {
    const { apartmentId, scheduledDate, scheduledTime, customerNote } = req.body;

    if (!apartmentId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'apartmentId, scheduledDate and scheduledTime are required'
      });
    }

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (apartment.status !== 'AVAILABLE') {
      return res.status(400).json({ success: false, message: 'Apartment is not available for booking' });
    }

    const booking = await Booking.create({
      customerId: req.user.id,
      agentId: apartment.agentId,
      apartmentId,
      scheduledDate,
      scheduledTime,
      customerNote,
      status: 'PENDING'
    });

    return res.status(201).json({ success: true, message: 'Booking created', data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'USER') {
      filter.customerId = req.user.id;
    } else if (req.user.role === 'AGENT') {
      filter.agentId = req.user.id;
    }

    const bookings = await Booking.find(filter)
      .populate('customerId', 'fullName email phone avatar status role')
      .populate('agentId', 'fullName email phone avatar status role agentInfo')
      .populate('apartmentId', 'title location transactionType price area status')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (req.user.role !== 'ADMIN' && booking.agentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const allowedTransitions = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['COMPLETED', 'CANCELLED'],
      CANCELLED: [],
      COMPLETED: []
    };

    const nextStatuses = allowedTransitions[booking.status] || [];
    if (!nextStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid booking status transition' });
    }

    if (status === 'CANCELLED' && !cancelReason) {
      return res.status(400).json({ success: false, message: 'cancelReason is required for cancellation' });
    }

    booking.status = status;
    booking.cancelReason = status === 'CANCELLED' ? cancelReason : booking.cancelReason;
    const updatedBooking = await booking.save();

    return res.status(200).json({ success: true, message: 'Booking status updated', data: updatedBooking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { createBooking, getMyBookings, updateBookingStatus };
