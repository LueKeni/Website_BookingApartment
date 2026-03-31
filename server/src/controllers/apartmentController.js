import Apartment from '../models/Apartment.js';
import Booking from '../models/Booking.js';
import mongoose from 'mongoose';
import User from '../models/User.js';

const ROOM_TYPE_ORDER = ['STUDIO', '1BR', '2BR', '3BR', 'DUPLEX', 'PENTHOUSE'];
const MAX_APARTMENT_IMAGES = 8;
const TOP_LISTING_SORT = { boostedAt: -1, createdAt: -1 };

const isValidObjectId = (value) => typeof value === 'string' && mongoose.Types.ObjectId.isValid(value.trim());

const getBoostPointCost = () => {
  const parsed = Number.parseInt(process.env.POINTS_PER_BOOST || '1', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseMaybeNumber = (value) => {
  if (value === '' || value === null || typeof value === 'undefined') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseJsonValue = (value, fallback = {}) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
};

const normalizeImageList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      const parsed = parseJsonValue(trimmed, []);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean);
      }
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const dedupeImageList = (value) => {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(list.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))];
};

const getUploadedImageUrls = (req) => {
  const files = Array.isArray(req.files) ? req.files : [];

  return files.map((file) => `${req.protocol}://${req.get('host')}/uploads/apartments/${file.filename}`);
};

const parseApartmentPayload = (req) => {
  const initialPayload = typeof req.body?.payload === 'string'
    ? parseJsonValue(req.body.payload, {})
    : { ...(req.body || {}) };

  const payload = { ...initialPayload };

  if (typeof payload.location === 'string') {
    payload.location = parseJsonValue(payload.location, {});
  }

  if (typeof payload.details === 'string') {
    payload.details = parseJsonValue(payload.details, {});
  }

  if (typeof payload.images !== 'undefined') {
    payload.images = normalizeImageList(payload.images);
  }

  const parsedPrice = parseMaybeNumber(payload.price);
  if (typeof parsedPrice !== 'undefined') {
    payload.price = parsedPrice;
  }

  const parsedArea = parseMaybeNumber(payload.area);
  if (typeof parsedArea !== 'undefined') {
    payload.area = parsedArea;
  }

  if (payload.location && typeof payload.location === 'object') {
    const parsedLatitude = parseMaybeNumber(payload.location.latitude);
    const parsedLongitude = parseMaybeNumber(payload.location.longitude);

    if (typeof parsedLatitude !== 'undefined') {
      payload.location.latitude = parsedLatitude;
    } else {
      delete payload.location.latitude;
    }

    if (typeof parsedLongitude !== 'undefined') {
      payload.location.longitude = parsedLongitude;
    } else {
      delete payload.location.longitude;
    }
  }

  // Promotion metadata is managed by dedicated APIs only.
  delete payload.boostedAt;
  delete payload.boostCount;

  return payload;
};

const getApartments = async (req, res) => {
  try {
    const {
      transactionType,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      city,
      district,
      status,
      agentId,
      roomType,
      sortBy,
      sortOrder,
      includeRentalStats,
      page,
      limit,
      excludeHidden
    } = req.query;

    const filter = {};
    const parsedPage = Number.parseInt(page, 10);
    const parsedLimit = Number.parseInt(limit, 10);
    const hasPagination = Number.isInteger(parsedPage) && parsedPage > 0 && Number.isInteger(parsedLimit) && parsedLimit > 0;
    const safeLimit = hasPagination ? Math.min(parsedLimit, 50) : null;
    const shouldExcludeHidden = String(excludeHidden || '').toLowerCase() === 'true';

    if (transactionType) {
      filter.transactionType = transactionType;
    }

    if (city) {
      const sanitizedCity = escapeRegex(String(city).trim());
      if (sanitizedCity) {
        filter['location.city'] = { $regex: sanitizedCity, $options: 'i' };
      }
    }

    if (district) {
      const sanitizedDistrict = escapeRegex(String(district).trim());
      if (sanitizedDistrict) {
        filter['location.district'] = { $regex: sanitizedDistrict, $options: 'i' };
      }
    }

    if (agentId) {
      const sanitizedAgentId = String(agentId).trim();
      if (!isValidObjectId(sanitizedAgentId)) {
        return res.status(400).json({ success: false, message: 'Invalid agentId filter' });
      }
      filter.agentId = sanitizedAgentId;
    }

    if (roomType) {
      filter.roomType = roomType;
    }

    const parsedMinPrice = parseMaybeNumber(minPrice);
    const parsedMaxPrice = parseMaybeNumber(maxPrice);
    if (typeof parsedMinPrice !== 'undefined' || typeof parsedMaxPrice !== 'undefined') {
      filter.price = {};
      if (typeof parsedMinPrice !== 'undefined') {
        filter.price.$gte = parsedMinPrice;
      }
      if (typeof parsedMaxPrice !== 'undefined') {
        filter.price.$lte = parsedMaxPrice;
      }
    }

    const parsedMinArea = parseMaybeNumber(minArea);
    const parsedMaxArea = parseMaybeNumber(maxArea);
    if (typeof parsedMinArea !== 'undefined' || typeof parsedMaxArea !== 'undefined') {
      filter.area = {};
      if (typeof parsedMinArea !== 'undefined') {
        filter.area.$gte = parsedMinArea;
      }
      if (typeof parsedMaxArea !== 'undefined') {
        filter.area.$lte = parsedMaxArea;
      }
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (status === 'ALL' && shouldExcludeHidden) {
      filter.status = { $ne: 'HIDDEN' };
    }

    if (!status) {
      filter.status = 'AVAILABLE';
    }

    const baseQuery = Apartment.find(filter)
      .populate('agentId', 'fullName email phone avatar role status agentInfo')
      .sort(TOP_LISTING_SORT);

    let apartments = [];
    let totalItems = 0;
    let currentPage = hasPagination ? parsedPage : 1;
    let totalPages = 1;

    if (sortBy === 'roomType') {
      const sortedApartments = await baseQuery;

      sortedApartments.sort((a, b) => {
        const aIndex = ROOM_TYPE_ORDER.indexOf(a.roomType);
        const bIndex = ROOM_TYPE_ORDER.indexOf(b.roomType);
        const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

        if (safeA !== safeB) {
          return sortOrder === 'desc' ? safeB - safeA : safeA - safeB;
        }

        const boostedDiff = new Date(b.boostedAt || 0) - new Date(a.boostedAt || 0);
        if (boostedDiff !== 0) {
          return boostedDiff;
        }

        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      if (hasPagination) {
        totalItems = sortedApartments.length;
        totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
        currentPage = Math.min(currentPage, totalPages);
        const sliceStart = (currentPage - 1) * safeLimit;
        apartments = sortedApartments.slice(sliceStart, sliceStart + safeLimit);
      } else {
        apartments = sortedApartments;
      }
    } else if (hasPagination) {
      totalItems = await Apartment.countDocuments(filter);
      totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
      currentPage = Math.min(currentPage, totalPages);

      apartments = await Apartment.find(filter)
        .populate('agentId', 'fullName email phone avatar role status agentInfo')
        .sort(TOP_LISTING_SORT)
        .skip((currentPage - 1) * safeLimit)
        .limit(safeLimit);
    } else {
      apartments = await baseQuery;
    }

    const shouldIncludeRentalStats = String(includeRentalStats || '').toLowerCase() === 'true';

    const responsePayload = {
      success: true,
      data: apartments
    };

    if (hasPagination) {
      responsePayload.pagination = {
        page: currentPage,
        limit: safeLimit,
        totalItems,
        totalPages,
        hasPrevPage: currentPage > 1,
        hasNextPage: currentPage < totalPages
      };
    }

    if (!shouldIncludeRentalStats) {
      return res.status(200).json(responsePayload);
    }

    const apartmentIds = apartments.map((item) => item._id);
    const rentalCountMap = new Map();

    if (apartmentIds.length) {
      const rentalStats = await Booking.aggregate([
        {
          $match: {
            apartmentId: { $in: apartmentIds },
            status: 'COMPLETED'
          }
        },
        {
          $group: {
            _id: '$apartmentId',
            rentalCount: { $sum: 1 }
          }
        }
      ]);

      rentalStats.forEach((item) => {
        rentalCountMap.set(String(item._id), item.rentalCount);
      });
    }

    const apartmentsWithRentalStats = apartments.map((apartment) => {
      const data = apartment.toObject();
      data.rentalCount = data.transactionType === 'RENT' ? rentalCountMap.get(String(data._id)) || 0 : 0;
      return data;
    });

    return res.status(200).json({
      ...responsePayload,
      data: apartmentsWithRentalStats
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getApartmentById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid apartment id' });
    }

    const apartment = await Apartment.findById(req.params.id).populate(
      'agentId',
      'fullName email phone avatar role status agentInfo'
    );

    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    return res.status(200).json({ success: true, data: apartment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createApartment = async (req, res) => {
  try {
    const payload = parseApartmentPayload(req);
    const uploadedImageUrls = getUploadedImageUrls(req);

    if (uploadedImageUrls.length > 0) {
      payload.images = uploadedImageUrls;
    }

    if (typeof payload.images !== 'undefined') {
      payload.images = dedupeImageList(payload.images);
      if (payload.images.length > MAX_APARTMENT_IMAGES) {
        return res.status(400).json({
          success: false,
          message: `You can upload up to ${MAX_APARTMENT_IMAGES} images for each apartment.`
        });
      }
    }

    payload.agentId = req.user.id;

    const apartment = await Apartment.create(payload);
    return res.status(201).json({ success: true, message: 'Apartment created', data: apartment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateApartment = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid apartment id' });
    }

    const apartment = await Apartment.findById(req.params.id);

    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (req.user.role !== 'ADMIN' && apartment.agentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const payload = parseApartmentPayload(req);
    const uploadedImageUrls = getUploadedImageUrls(req);

    if (Array.isArray(payload.images)) {
      payload.images = dedupeImageList(payload.images);
    }

    if (uploadedImageUrls.length > 0) {
      const baseImages = Array.isArray(payload.images) ? payload.images : apartment.images;
      payload.images = dedupeImageList([...uploadedImageUrls, ...(Array.isArray(baseImages) ? baseImages : [])]);
    }

    if (Array.isArray(payload.images) && payload.images.length > MAX_APARTMENT_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `You can upload up to ${MAX_APARTMENT_IMAGES} images for each apartment.`
      });
    }

    delete payload.agentId;

    Object.assign(apartment, payload);
    const updatedApartment = await apartment.save();

    return res.status(200).json({ success: true, message: 'Apartment updated', data: updatedApartment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateApartmentStatus = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid apartment id' });
    }

    const { status } = req.body;
    const apartment = await Apartment.findById(req.params.id);

    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (req.user.role !== 'ADMIN' && apartment.agentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    apartment.status = status;
    const updatedApartment = await apartment.save();

    return res.status(200).json({ success: true, message: 'Apartment status updated', data: updatedApartment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteApartment = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid apartment id' });
    }

    const apartment = await Apartment.findById(req.params.id);

    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (req.user.role !== 'ADMIN' && apartment.agentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await apartment.deleteOne();

    return res.status(200).json({ success: true, message: 'Apartment deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const boostApartmentListing = async (req, res) => {
  const pointCost = getBoostPointCost();

  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid apartment id' });
    }

    const apartment = await Apartment.findById(req.params.id).select('agentId');

    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (apartment.agentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user.id,
        role: 'AGENT',
        agentPoints: { $gte: pointCost }
      },
      {
        $inc: { agentPoints: -pointCost }
      },
      { new: true }
    ).select('agentPoints');

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: `Insufficient points. You need at least ${pointCost} point(s) to boost this listing.`
      });
    }

    const promotedApartment = await Apartment.findOneAndUpdate(
      { _id: req.params.id, agentId: req.user.id },
      { $set: { boostedAt: new Date() }, $inc: { boostCount: 1 } },
      { new: true }
    );

    if (!promotedApartment) {
      await User.findByIdAndUpdate(req.user.id, { $inc: { agentPoints: pointCost } });
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Listing promoted to top successfully.',
      data: {
        apartment: promotedApartment,
        pointCost,
        remainingPoints: updatedUser.agentPoints
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export {
  boostApartmentListing,
  createApartment,
  deleteApartment,
  getApartmentById,
  getApartments,
  updateApartment,
  updateApartmentStatus
};
