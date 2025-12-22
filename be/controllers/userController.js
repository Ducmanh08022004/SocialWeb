
const { User, Profile, Friendship } = require('../models');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { Op } = require('sequelize');

const getMyProfile = async (req, res) => {
  try {
    const user = req.user;
    console.log('[getMyProfile] User:', user.id);
    const profile = await Profile.findOne({ where: { user_id: user.id } });
    
    const friendCount = await Friendship.count({
      where: {
        user_id: user.id,
        status: 'accepted'
      }
    });

    res.json({ 
      user: { id: user.id, username: user.username, email: user.email, status: user.status }, 
      profile,
      friendCount
    });
  } catch (err) {
    console.error('[getMyProfile] Error:', err);
    res.status(500).json({ message: 'Lỗi lấy thông tin cá nhân', error: err.message });
  }
};

const getProfileById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user.id;
    console.log(`[getProfileById] Target: ${userId}, Current: ${currentUserId}`);

    const profile = await Profile.findOne({ 
      where: { user_id: userId },
      include: [{ model: User, attributes: ['id', 'username', 'email', 'status'] }]
    });
    if (!profile) {
      console.log('[getProfileById] Profile not found');
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    const friendCount = await Friendship.count({
      where: {
        user_id: userId,
        status: 'accepted'
      }
    });

    let friendship = null;
    if (currentUserId && currentUserId != userId) {
        friendship = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { user_id: currentUserId, friend_id: userId },
                    { user_id: userId, friend_id: currentUserId }
                ]
            }
        });
    }

    // Flatten the structure slightly for the frontend or just return as is
    // The frontend expects profile fields at top level or inside profile object
    // Let's return { profile, user: profile.User }
    res.json({ profile, user: profile.User, friendCount, friendship });
  } catch (err) {
    console.error('[getProfileById] Error:', err);
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

    console.log('\n🔵 ========== AVATAR UPLOAD START ==========');
    console.log('📥 User ID:', userId);
    console.log('📥 req.files keys:', req.files ? Object.keys(req.files) : 'undefined');
    console.log('📥 req.file:', req.file ? req.file.fieldname : 'undefined');
    console.log('📥 defaultModel:', defaultModel);
    
    if (req.files) {
      Object.entries(req.files).forEach(([key, files]) => {
        console.log(`   - ${key}: ${files.map(f => f.filename).join(', ')}`);
      });
    }

    if (!req.files && !req.file && !defaultModel) {
      console.log('❌ No files provided');
      return res.status(400).json({ message: 'Không có dữ liệu avatar' });
    }

    let avatarUrl, thumbnailUrl;
    let avatarPublicId = null, thumbnailPublicId = null;
    let avatarType = 'image';

    // 1️⃣ Nếu dùng Model mặc định
    if (defaultModel) {
      avatarUrl = `${process.env.CDN_URL}/default-models/${defaultModel}.glb`;
      avatarType = 'model3d';
      console.log('✅ Using default model');
    } 
    // 2️⃣ Nếu Upload 2 files: thumbnail + model (req.files từ upload.fields)
    else if (req.files && (req.files.thumbnail || req.files.model)) {
      const thumbnailFile = req.files.thumbnail?.[0];
      const modelFile = req.files.model?.[0];

      console.log('📦 Processing files - thumbnail:', thumbnailFile?.filename, 'model:', modelFile?.filename);

      // Upload cả thumbnail + 3D model
      if (thumbnailFile && modelFile) {
        console.log('⬆️ Uploading thumbnail and model...');
        
        // Upload thumbnail
        const thumbnailResult = await cloudinary.uploader.upload(thumbnailFile.path, {
          folder: 'social_app/avatar_thumbnail',
          resource_type: 'image'
        });
        thumbnailUrl = thumbnailResult.secure_url;
        thumbnailPublicId = thumbnailResult.public_id;
        console.log('✅ Thumbnail uploaded:', thumbnailUrl);

        // Upload 3D model
        const modelResult = await cloudinary.uploader.upload(modelFile.path, {
          folder: 'social_app/avatar_3d',
          resource_type: 'raw'
        });
        avatarUrl = modelResult.secure_url;
        avatarPublicId = modelResult.public_id;
        avatarType = 'model3d';
        console.log('✅ Model uploaded:', avatarUrl);

        // Xóa file tạm
        try { fs.unlinkSync(thumbnailFile.path); } catch (_) {}
        try { fs.unlinkSync(modelFile.path); } catch (_) {}
      }
      // Upload chỉ ảnh (fallback nếu thiếu model)
      else if (thumbnailFile) {
        console.log('⬆️ Uploading thumbnail only...');
        const thumbnailResult = await cloudinary.uploader.upload(thumbnailFile.path, {
          folder: 'social_app/avatar',
          resource_type: 'image'
        });
        avatarUrl = thumbnailResult.secure_url;
        avatarPublicId = thumbnailResult.public_id;
        avatarType = 'image';
        console.log('✅ Avatar uploaded:', avatarUrl);
        try { fs.unlinkSync(thumbnailFile.path); } catch (_) {}
      }
      // Upload chỉ model (fallback nếu thiếu thumbnail)
      else if (modelFile) {
        console.log('⬆️ Uploading model only...');
        const modelResult = await cloudinary.uploader.upload(modelFile.path, {
          folder: 'social_app/avatar_3d',
          resource_type: 'raw'
        });
        avatarUrl = modelResult.secure_url;
        avatarPublicId = modelResult.public_id;
        avatarType = 'model3d';
        console.log('✅ Model uploaded:', avatarUrl);
        try { fs.unlinkSync(modelFile.path); } catch (_) {}
      }
      else {
        return res.status(400).json({ message: 'Không có file được upload' });
      }
    }
    // 3️⃣ Fallback: Upload chỉ một file (ảnh hoặc 3D) - legacy support
    else if (req.file) {
      console.log('⬆️ Legacy upload - req.file:', req.file.filename);
      
      avatarType = req.file._is3D ? 'model3d' : 'image';
      const resourceType = avatarType === 'model3d' ? 'raw' : 'image';
      const folderPath = avatarType === 'model3d' ? 'social_app/avatar_3d' : 'social_app/avatar';

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: folderPath,
        resource_type: resourceType
      });

      avatarUrl = result.secure_url;
      avatarPublicId = result.public_id;
      console.log('✅ File uploaded (legacy):', avatarUrl);

      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    else {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    // 4️⃣ Cập nhật Database
    console.log('💾 Updating database...');
    const profile = await Profile.findOne({ where: { user_id: userId } });

    // Xoá file cũ trên Cloudinary
    if (profile?.avatar_public_id) {
      console.log('🗑️ Deleting old avatar...');
      await cloudinary.uploader.destroy(profile.avatar_public_id, {
        resource_type: profile.avatar_type === 'model3d' ? 'raw' : 'image'
      }).catch(err => console.error("❌ Xóa avatar cũ lỗi:", err.message));
    }

    if (profile?.avatar_thumbnail_public_id) {
      console.log('🗑️ Deleting old thumbnail...');
      await cloudinary.uploader.destroy(profile.avatar_thumbnail_public_id, {
        resource_type: 'image'
      }).catch(err => console.error("❌ Xóa thumbnail cũ lỗi:", err.message));
    }

    // Lưu vào DB
    const updateData = {
      user_id: userId,
      avatar_url: avatarUrl,
      avatar_public_id: avatarPublicId,
      avatar_type: avatarType,
      updated_at: new Date()
    };

    // Always clear/set thumbnail fields
    if (thumbnailUrl !== undefined) {
      updateData.avatar_thumbnail_url = thumbnailUrl || null;
      updateData.avatar_thumbnail_public_id = thumbnailPublicId || null;
    } else {
      // If no thumbnail uploaded, clear old thumbnail
      updateData.avatar_thumbnail_url = null;
      updateData.avatar_thumbnail_public_id = null;
    }

    await Profile.upsert(updateData);
    console.log('✅ Database updated');
    console.log('🔵 ========== AVATAR UPLOAD SUCCESS ==========\n');

    res.json({
      message: 'Cập nhật avatar thành công',
      profile: {
        avatar_url: avatarUrl,
        avatar_thumbnail_url: thumbnailUrl || null,
        avatar_type: avatarType
      }
    });

  } catch (err) {
    console.error('\n🔴 ========== AVATAR UPLOAD ERROR ==========');
    console.error('❌ Message:', err.message);
    console.error('❌ Stack:', err.stack);
    console.error('🔴 ==========================================\n');

    // Xóa file tạm nếu lỗi
    if (req.files) {
      Object.values(req.files).forEach(files => {
        files.forEach(file => {
          try { fs.unlinkSync(file.path); } catch (_) {}
        });
      });
    }
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
    
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
        cover_position: 0,
        updated_at: new Date()
      });
    } else {
      await profile.update({
        cover_url: coverUrl,
        cover_public_id: publicId,
        cover_position: 0,
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

    // Add friendship status and friend count
    const results = await Promise.all(users.map(async (user) => {
      const friendship = await Friendship.findOne({
        where: {
          [Op.or]: [
            { user_id: currentUserId, friend_id: user.id },
            { user_id: user.id, friend_id: currentUserId }
          ]
        }
      });

      const friendCount = await Friendship.count({
        where: {
          user_id: user.id,
          status: 'accepted'
        }
      });
      
      const userJson = user.toJSON();
      userJson.friendship = friendship ? { status: friendship.status } : null;
      userJson.friendCount = friendCount;
      return userJson;
    }));

    res.json({ users: results });
  } catch (err) {
    console.error('Lỗi tìm kiếm người dùng:', err);
    res.status(500).json({ message: 'Lỗi tìm kiếm người dùng', error: err.message });
  }
};

module.exports = { getMyProfile, getProfileById, updateProfile, updateAvatar, updateCover, searchUsers };
