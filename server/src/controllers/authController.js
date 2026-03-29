import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const buildAuthResponse = (user) => {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

  return {
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      agentInfo: user.agentInfo
    }
  };
};

const register = async (req, res) => {
  try {
    const { fullName, email, password, phone, avatar, role, agentInfo } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'fullName, email and password are required' });
    }

    if (role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot register ADMIN account' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      avatar,
      role: role || 'USER',
      agentInfo: role === 'AGENT' ? agentInfo : undefined
    });

    return res.status(201).json({ success: true, message: 'Register successful', data: buildAuthResponse(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({ success: false, message: 'Account is banned' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.status(200).json({ success: true, message: 'Login successful', data: buildAuthResponse(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { login, register };
