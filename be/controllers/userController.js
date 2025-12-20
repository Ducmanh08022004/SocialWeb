
const { User, Profile, Friendship } = require('../models');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { Op } = require('sequelize');

const getMyProfile = async (req, res) => {
  const user = req.user;
  const profile = await Profile.findOne({ where: { user_id: user.id } });
  res.json({ user: { id: user.id, username: user.username, email: user.email, status: user.status }, profile });
};

const getProfileById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const profile = await Profile.findOne({ 
      where: { user_id: userId },
      include: [{ model: User, attributes: ['id', 'username', 'email', 'status'] }]
    });
    if (!profile) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    // Flatten the structure slightly for the frontend or just return as is
    // The frontend expects profile fields at top level or inside profile object
    // Let's return { profile, user: profile.User }
    res.json({ profile, user: profile.User });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy thông tin', error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const data = req.body;
    
    // Xử lý birthday: nếu trống thì set null, nếu không phải date hợp lệ thì set null
    if (!data.birthday || data.birthday.trim() === '') {
      data.birthday = null;
    } else {
      // Kiểm tra xem có phải date hợp lệ không
      const dateTest = new Date(data.birthday);
      if (isNaN(dateTest.getTime())) {
        data.birthday = null;
      }
    }
    
    let profile = await Profile.findOne({ where: { user_id: user.id } });
    if (!profile) {
      data.user_id = user.id;
      profile = await Profile.create(data);
    } else {
      await profile.update({ ...data, updated_at: new Date() });
    }
    res.json({ profile });
  } catch (err) {
    console.error('Lỗi cập nhật profile:', err);
    res.status(500).json({ message: 'Lỗi cập nhật profile', error: err.message });
  }
};

const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ message: 'Chưa có file upload' });

    let avatarUrl = '';
    let publicId = null;

    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                   process.env.CLOUDINARY_API_KEY && 
                                   process.env.CLOUDINARY_API_SECRET;

    if (isCloudinaryConfigured) {
        try {
            // Upload avatar mới
            const result = await cloudinary.uploader.upload(req.file.path, {
              folder: 'social_app/avatars',
              resource_type: "auto" 
            });
            avatarUrl = result.secure_url;
            publicId = result.public_id;
            
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        } catch (uploadError) {
            console.error(`Cloudinary upload failed: ${uploadError.message}`);
            avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }
    } else {
        avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Lấy profile
    let profile = await Profile.findOne({ where: { user_id: userId } });

    // Xóa avatar cũ nếu có
    if (profile && profile.avatar_public_id && isCloudinaryConfigured && publicId) {
      try {
        await cloudinary.uploader.destroy(profile.avatar_public_id, {
          resource_type: "image"
        });
      } catch (e) {
        console.error("Lỗi khi xóa avatar cũ:", e);
      }
    }

    // Cập nhật hoặc tạo
    if (!profile) {
      profile = await Profile.create({
        user_id: userId,
        avatar_url: avatarUrl,
        avatar_public_id: publicId,
        updated_at: new Date()
      });
    } else {
      await profile.update({
        avatar_url: avatarUrl,
        avatar_public_id: publicId,
        updated_at: new Date()
      });
    }

    res.json({ 
      message: 'Cập nhật avatar thành công', 
      image_url: avatarUrl 
    });

  } catch (err) {
    res.status(500).json({ message: 'Lỗi upload avatar', error: err.message });
  }
};

const updateCover = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ message: 'Chưa có file upload' });

    let coverUrl = '';
    let publicId = null;

    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                   process.env.CLOUDINARY_API_KEY && 
                                   process.env.CLOUDINARY_API_SECRET;

    if (isCloudinaryConfigured) {
        try {
            // Upload cover mới
            const result = await cloudinary.uploader.upload(req.file.path, {
              folder: 'social_app/covers',
              resource_type: "auto" 
            });
            coverUrl = result.secure_url;
            publicId = result.public_id;
            
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        } catch (uploadError) {
            console.error(`Cloudinary upload failed: ${uploadError.message}`);
            coverUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }
    } else {
        coverUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Lấy profile
    let profile = await Profile.findOne({ where: { user_id: userId } });

    // Xóa cover cũ nếu có
    if (profile && profile.cover_public_id && isCloudinaryConfigured && publicId) {
      try {
        await cloudinary.uploader.destroy(profile.cover_public_id, {
          resource_type: "image"
        });
      } catch (e) {
        console.error("Lỗi khi xóa cover cũ:", e);
      }
    }

    // Cập nhật hoặc tạo
    if (!profile) {
      profile = await Profile.create({
        user_id: userId,
        cover_url: coverUrl,
        cover_public_id: publicId,
        updated_at: new Date()
      });
    } else {
      await profile.update({
        cover_url: coverUrl,
        cover_public_id: publicId,
        updated_at: new Date()
      });
    }

    res.json({ 
      message: 'Cập nhật ảnh bìa thành công', 
      image_url: coverUrl 
    });

  } catch (err) {
    res.status(500).json({ message: 'Lỗi upload ảnh bìa', error: err.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { q } = req.query;
    
    console.log(`[SEARCH DEBUG] User: ${currentUserId}, Query: '${q}'`);

    let whereClause = {
      id: { [Op.ne]: currentUserId }
    };

    if (q && q.trim() !== '') {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${q}%` } },
        { '$Profile.fullname$': { [Op.like]: `%${q}%` } }
      ];
    }

    const users = await User.findAll({
      where: whereClause,
      include: [{
        model: Profile,
        required: false 
      }],
      subQuery: false,
      limit: 20,
      order: [['created_at', 'DESC']]
    });

    console.log(`[SEARCH DEBUG] Found ${users.length} users`);

    // Add friendship status
    const results = await Promise.all(users.map(async (user) => {
      const friendship = await Friendship.findOne({
        where: {
          [Op.or]: [
            { user_id: currentUserId, friend_id: user.id },
            { user_id: user.id, friend_id: currentUserId }
          ]
        }
      });
      
      const userJson = user.toJSON();
      userJson.friendship = friendship ? { status: friendship.status } : null;
      return userJson;
    }));

    res.json({ users: results });
  } catch (err) {
    console.error('Lỗi tìm kiếm người dùng:', err);
    res.status(500).json({ message: 'Lỗi tìm kiếm người dùng', error: err.message });
  }
};

module.exports = { getMyProfile, getProfileById, updateProfile, updateAvatar, updateCover, searchUsers };
