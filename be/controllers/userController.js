
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
    const { defaultModel } = req.body;

    if (!req.file && !defaultModel) {
      return res.status(400).json({ message: 'Không có dữ liệu avatar' });
    }

    let avatarUrl;
    let publicId = null;
    let avatarType = 'image';

    // 1️⃣ Nếu dùng Model mặc định
    if (defaultModel) {
      avatarUrl = `${process.env.CDN_URL}/default-models/${defaultModel}.glb`;
      avatarType = 'model3d';
    } 
    // 2️⃣ Nếu Upload file (Ảnh hoặc 3D)
    else if (req.file) {
      // Xác định loại file dựa trên middleware multer đã xử lý trước đó
      avatarType = req.file._is3D ? 'model3d' : 'image';
      const resourceType = avatarType === 'model3d' ? 'raw' : 'image';
      const folderPath = avatarType === 'model3d' ? 'social_app/avatar_3d' : 'social_app/avatar';

      // UPLOAD LÊN CLOUDINARY
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: folderPath,
        resource_type: resourceType,
        // Đảm bảo không truyền thừa tham số nào khác vào đây nếu không cần thiết
      });

      avatarUrl = result.secure_url;
      publicId = result.public_id;

      // Xóa file tạm sau khi upload thành công
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }

    // 3️⃣ Cập nhật Database
    const profile = await Profile.findOne({ where: { user_id: userId } });

    // Xoá file cũ trên Cloudinary để tiết kiệm bộ nhớ
    if (profile?.avatar_public_id) {
      await cloudinary.uploader.destroy(profile.avatar_public_id, {
        // QUAN TRỌNG: Phải đúng resource_type cũ mới xóa được
        resource_type: profile.avatar_type === 'model3d' ? 'raw' : 'image'
      }).catch(err => console.error("Xóa file cũ lỗi:", err.message));
    }

    // Lưu vào DB
    await Profile.upsert({
      user_id: userId,
      avatar_url: avatarUrl,
      avatar_public_id: publicId,
      avatar_type: avatarType,
      updated_at: new Date()
    });

    res.json({
      message: 'Cập nhật avatar thành công',
      avatar_url: avatarUrl,
      avatar_type: avatarType
    });

  } catch (err) {
    // Nếu lỗi, vẫn nên xóa file tạm để tránh rác server
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
    
    console.error('UPDATE AVATAR ERROR:', err);
    res.status(500).json({
      message: 'Cập nhật avatar thất bại',
      error: err.message
    });
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
