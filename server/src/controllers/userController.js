import User from '../models/User.js';

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
    const { fullName, phone, avatar, agentInfo } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (typeof fullName !== 'undefined') {
      user.fullName = fullName;
    }

    if (typeof phone !== 'undefined') {
      user.phone = phone;
    }

    if (typeof avatar !== 'undefined') {
      user.avatar = avatar;
    }

    if (user.role === 'AGENT' && typeof agentInfo !== 'undefined') {
      user.agentInfo = { ...user.agentInfo, ...agentInfo };
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
        favorites: updatedUser.favorites
      }
    });
  } catch (error) {
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
