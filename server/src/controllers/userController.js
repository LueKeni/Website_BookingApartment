import User from '../models/User.js';

const ALLOWED_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

const toPlainObject = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value.toObject === 'function') {
    return value.toObject();
  }

  return { ...value };
};

const normalizeOptionalString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const createBadRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const parseOptionalObjectField = (value, fieldName) => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (value === null || value === '') {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('invalid');
      }
      return parsed;
    } catch {
      throw createBadRequestError(`${fieldName} must be a valid JSON object`);
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  throw createBadRequestError(`${fieldName} must be an object`);
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('favorites');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, avatar, removeAvatar } = req.body;
    const agentInfo = parseOptionalObjectField(req.body.agentInfo, 'agentInfo');
    const personalInfo = parseOptionalObjectField(req.body.personalInfo, 'personalInfo');
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (typeof fullName !== 'undefined') {
      const normalizedFullName = String(fullName || '').trim();
      if (!normalizedFullName) {
        return res.status(400).json({ success: false, message: 'fullName cannot be empty' });
      }
      user.fullName = normalizedFullName;
    }

    if (typeof phone !== 'undefined') {
      user.phone = normalizeOptionalString(phone);
    }

    if (req.file?.filename) {
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    } else if (String(removeAvatar || '').toLowerCase() === 'true') {
      user.avatar = undefined;
    } else if (typeof avatar !== 'undefined') {
      user.avatar = normalizeOptionalString(avatar);
    }

    if (user.role === 'AGENT' && typeof agentInfo !== 'undefined') {
      if (!agentInfo || typeof agentInfo !== 'object' || Array.isArray(agentInfo)) {
        return res.status(400).json({ success: false, message: 'agentInfo must be an object' });
      }

      const nextAgentInfo = {
        ...toPlainObject(user.agentInfo),
        ...agentInfo
      };

      if (typeof nextAgentInfo.location === 'string') {
        nextAgentInfo.location = nextAgentInfo.location.trim();
      }

      if (Array.isArray(nextAgentInfo.availableDays)) {
        nextAgentInfo.availableDays = nextAgentInfo.availableDays
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean);
      }

      user.agentInfo = nextAgentInfo;
    }

    if (typeof personalInfo !== 'undefined') {
      if (!personalInfo || typeof personalInfo !== 'object' || Array.isArray(personalInfo)) {
        return res.status(400).json({ success: false, message: 'personalInfo must be an object' });
      }

      const nextPersonalInfo = {
        ...toPlainObject(user.personalInfo)
      };

      if (Object.prototype.hasOwnProperty.call(personalInfo, 'dateOfBirth')) {
        if (!personalInfo.dateOfBirth) {
          nextPersonalInfo.dateOfBirth = undefined;
        } else {
          const date = new Date(personalInfo.dateOfBirth);
          if (Number.isNaN(date.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid dateOfBirth value' });
          }
          nextPersonalInfo.dateOfBirth = date;
        }
      }

      if (Object.prototype.hasOwnProperty.call(personalInfo, 'gender')) {
        if (!personalInfo.gender) {
          nextPersonalInfo.gender = undefined;
        } else if (!ALLOWED_GENDERS.includes(personalInfo.gender)) {
          return res.status(400).json({ success: false, message: 'Invalid gender value' });
        } else {
          nextPersonalInfo.gender = personalInfo.gender;
        }
      }

      if (Object.prototype.hasOwnProperty.call(personalInfo, 'occupation')) {
        nextPersonalInfo.occupation = normalizeOptionalString(personalInfo.occupation);
      }

      if (Object.prototype.hasOwnProperty.call(personalInfo, 'website')) {
        nextPersonalInfo.website = normalizeOptionalString(personalInfo.website);
      }

      if (Object.prototype.hasOwnProperty.call(personalInfo, 'address')) {
        nextPersonalInfo.address = normalizeOptionalString(personalInfo.address);
      }

      if (Object.prototype.hasOwnProperty.call(personalInfo, 'bio')) {
        nextPersonalInfo.bio = normalizeOptionalString(personalInfo.bio);
      }

      user.personalInfo = nextPersonalInfo;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated',
      data: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        status: updatedUser.status,
        agentInfo: updatedUser.agentInfo,
        personalInfo: updatedUser.personalInfo,
        favorites: updatedUser.favorites
      }
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'BANNED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot update your own status' });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({ success: true, message: 'User status updated', data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['USER', 'AGENT', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot update your own role' });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = role;

    if (role !== 'AGENT') {
      user.agentInfo = undefined;
    }

    await user.save();

    return res.status(200).json({ success: true, message: 'User role updated', data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const toggleFavoriteApartment = async (req, res) => {
  try {
    const { apartmentId } = req.body;
    if (!apartmentId) {
      return res.status(400).json({ success: false, message: 'apartmentId is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const exists = user.favorites.some((item) => item.toString() === apartmentId);

    if (exists) {
      user.favorites = user.favorites.filter((item) => item.toString() !== apartmentId);
    } else {
      user.favorites.push(apartmentId);
    }

    await user.save();
    await user.populate('favorites');

    return res.status(200).json({
      success: true,
      message: exists ? 'Removed from favorites' : 'Added to favorites',
      data: user.favorites
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { getProfile, getUsers, toggleFavoriteApartment, toggleUserStatus, updateProfile, updateUserRole };
