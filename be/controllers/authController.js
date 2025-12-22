
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { User, Profile } = require('../models');
const { Op } = require('sequelize');

const register = async (req, res) => {
  try {
    console.log('📝 REGISTER ATTEMPT:', req.body.username);
    const { username, password, email, fullname } = req.body;
    if (!username || !password || !email) return res.status(400).json({ message: 'Thiếu thông tin' });

    const exists = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (exists) {
      console.log('❌ User already exists:', username);
      return res.status(409).json({ message: 'Username hoặc email đã tồn tại' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash, email });

    if (fullname) {
      await Profile.create({ user_id: user.id, fullname, avatar_url: 'social_network/publicAsset/default_avatar.png' });
    }

    console.log('✅ REGISTER SUCCESS:', username);
    res.json({user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('❌ REGISTER ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const login = async (req, res) => {
  try {
    console.log('🔐 LOGIN ATTEMPT:', req.body.usernameOrEmail);
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) return res.status(400).json({ message: 'Thiếu thông tin' });

    const user = await User.findOne({
      where: { [Op.or]: [{ username: usernameOrEmail }, { email: usernameOrEmail }] },
      include: { model: Profile }
    });
    if (!user) {
      console.log('❌ User not found:', usernameOrEmail);
      return res.status(401).json({ message: 'Sai thông tin đăng nhập' });
    }

    console.log('✅ User found:', user.username);

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log('❌ Password incorrect');
      return res.status(401).json({ message: 'Sai thông tin đăng nhập' });
    }

    console.log('✅ Password correct');

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    
    // Return user without password
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      Profile: user.Profile
    };
    
    console.log('✅ LOGIN SUCCESS:', user.username);
    res.json({ token, user: userResponse });
  } catch (err) {
    console.error('❌ LOGIN ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: { model: Profile }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Thiếu thông tin' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    // Verify old password
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) return res.status(401).json({ message: 'Mật khẩu cũ không chính xác' });

    // Hash and update new password
    const hash = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hash });

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { register, login, changePassword, getMe };
