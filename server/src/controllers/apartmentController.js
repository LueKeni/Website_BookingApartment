import Apartment from '../models/Apartment.js';

const getApartments = async (req, res) => {
  try {
    const { transactionType, minPrice, maxPrice, minArea, maxArea, city, district, status, agentId } = req.query;

    const filter = {};

    if (transactionType) {
      filter.transactionType = transactionType;
    }

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    if (district) {
      filter['location.district'] = { $regex: district, $options: 'i' };
    }

    if (agentId) {
      filter.agentId = agentId;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    if (minArea || maxArea) {
      filter.area = {};
      if (minArea) {
        filter.area.$gte = Number(minArea);
      }
      if (maxArea) {
        filter.area.$lte = Number(maxArea);
      }
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (!status) {
      filter.status = 'AVAILABLE';
    }

    const apartments = await Apartment.find(filter)
      .populate('agentId', 'fullName phone avatar role status agentInfo')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: apartments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getApartmentById = async (req, res) => {
  try {
    const apartment = await Apartment.findById(req.params.id).populate(
      'agentId',
      'fullName phone avatar role status agentInfo'
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
    const payload = { ...req.body, agentId: req.user.id };
    const apartment = await Apartment.create(payload);
    return res.status(201).json({ success: true, message: 'Apartment created', data: apartment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateApartment = async (req, res) => {
  try {
    const apartment = await Apartment.findById(req.params.id);

    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (req.user.role !== 'ADMIN' && apartment.agentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    Object.assign(apartment, req.body);
    const updatedApartment = await apartment.save();

    return res.status(200).json({ success: true, message: 'Apartment updated', data: updatedApartment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateApartmentStatus = async (req, res) => {
  try {
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

export {
  createApartment,
  deleteApartment,
  getApartmentById,
  getApartments,
  updateApartment,
  updateApartmentStatus
};
