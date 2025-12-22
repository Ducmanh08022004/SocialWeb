
const { sequelize, Post, PostMedia, User, Profile, Like, Comment, Friendship } = require('../models');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { Op } = require('sequelize');

const createPost = async (req, res) => {
  console.log('--- CREATE POST ---');

  try {
    const userId = req.user.id;
    const { content, privacy, defaultModels } = req.body;

    // 1️⃣ Tạo post
    const post = await Post.create({
      user_id: userId,
      content,
      privacy: privacy || 'public',
      created_at: new Date()
    });

    const uploads = [];
    const cloudinaryReady =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    // 2️⃣ Upload FILE (ảnh / video / model 3D)
    if (req.files?.length) {
      for (const file of req.files) {
        let mediaType = 'image';
        if (file._isVideo) mediaType = 'video';
        if (file._is3D) mediaType = 'model3d';

        let mediaUrl = '';
        let publicId = null;

        try {
          if (cloudinaryReady) {
            const result = await cloudinary.uploader.upload(file.path, {
              folder:
                mediaType === 'model3d'
                  ? 'social_app/post_3d'
                  : 'social_app/posts',
              resource_type:
                mediaType === 'model3d' ? 'raw' : 'auto',
              timeout: 120000
            });

            mediaUrl = result.secure_url;
            publicId = result.public_id;
            fs.unlinkSync(file.path);
          } else {
            mediaUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
          }
        } catch (err) {
          console.error('Upload error:', err.message);
          mediaUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        }

        uploads.push({
          post_id: post.id,
          media_url: mediaUrl,
          type: mediaType,
          public_id: publicId
        });
      }
    }

    // 3️⃣ Model 3D MẶC ĐỊNH
    if (Array.isArray(defaultModels)) {
      for (const model of defaultModels) {
        uploads.push({
          post_id: post.id,
          media_url: `${process.env.CDN_URL}/default-models/${model}.glb`,
          type: 'model3d',
          public_id: null
        });
      }
    }

    // 4️⃣ Lưu media
    if (uploads.length) {
      console.log('📤 Saving media:', uploads.length, 'items');
      try {
        await PostMedia.bulkCreate(uploads);
        console.log('✅ Media saved successfully');
      } catch (mediaErr) {
        console.error('❌ Media save error:', mediaErr.message);
        throw mediaErr;
      }
    }

    const media = await PostMedia.findAll({
      where: { post_id: post.id }
    });

    res.json({ post, media });

  } catch (err) {
    console.error('CREATE POST ERROR:', err);
    res.status(500).json({
      message: 'Lỗi upload bài viết',
      error: err.message
    });
  }
};


const getPost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      attributes: {
        include: [
          [sequelize.literal('(SELECT COUNT(*) FROM likes WHERE likes.post_id = Post.id)'), 'likeCount'],
          [sequelize.literal('(SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id)'), 'commentCount']
        ]
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username'],
          include: {
            model: Profile,
            attributes: ['fullname', 'avatar_url']
          }
        },
        {
          model: PostMedia,
          as: 'media',
          attributes: ['id', 'media_url', 'type'],
          required: false
        }
      ]
    });
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy bài viết', error: err.message });
  }
};

const listPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;

    const where = {};
    if (userId) {
      where.user_id = userId;
    } else if (req.user) {
      // Feed: Show posts from friends + self
      const currentUserId = req.user.id;
      
      const friendships = await Friendship.findAll({
        where: {
          status: 'accepted',
          [Op.or]: [
            { user_id: currentUserId },
            { friend_id: currentUserId }
          ]
        }
      });

      const friendIds = friendships.map(f => 
        f.user_id === currentUserId ? f.friend_id : f.user_id
      );
      
      // Add self
      friendIds.push(currentUserId);

      where.user_id = { [Op.in]: friendIds };
    }

    const posts = await Post.findAll({
      where,
      raw: false,
      attributes: {
        include: [
          [sequelize.literal('(SELECT COUNT(*) FROM likes WHERE likes.post_id = Post.id)'), 'likeCount'],
          [sequelize.literal('(SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id)'), 'commentCount']
        ]
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username'],
          include: {
            model: Profile,
            attributes: ['fullname', 'avatar_url']
          }
        },
        {
          model: PostMedia,
          as: 'media',
          attributes: ['id', 'media_url', 'type'],
          required: false
        },
        {
          model: Like,
          attributes: ['id'],
          required: false
        },
        {
          model: Comment,
          attributes: ['id'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Debug logging
    if (posts.length > 0) {
    }

    res.json(posts.length > 0 ? posts : []);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách bài viết', error: err.message });
  }
};

const deletePost = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const post = await Post.findByPk(req.params.id);
    
    if (!post) {
      await t.rollback();
      return res.status(404).json({ message: 'Không tìm thấy' });
    }

    console.log(`[DELETE POST DEBUG] UserID: ${userId} (${typeof userId}), PostOwnerID: ${post.user_id} (${typeof post.user_id})`);
    
    // Use loose equality or explicit conversion to handle potential type mismatches
    if (parseInt(post.user_id) !== parseInt(userId)) {
      await t.rollback();
      return res.status(403).json({ message: 'Không có quyền' });
    }

    // 1. Delete media from Cloudinary (outside transaction, best effort)
    const medias = await PostMedia.findAll({ where: { post_id: post.id } });
    for (const m of medias) {
      if (m.public_id) {
        try {
          await cloudinary.uploader.destroy(m.public_id, { resource_type: "auto" });
        } catch (e) {
          console.error("Cloudinary delete error:", e);
        }
      }
    }

    // 2. Delete associations in DB
    await PostMedia.destroy({ where: { post_id: post.id }, transaction: t });
    await Like.destroy({ where: { post_id: post.id }, transaction: t });
    await Comment.destroy({ where: { post_id: post.id }, transaction: t });

    // 3. Delete post
    await post.destroy({ transaction: t });
    
    await t.commit();
    res.json({ message: 'Xóa thành công' });
  } catch (err) {
    await t.rollback();
    console.error("DELETE POST ERROR:", err);
    res.status(500).json({ message: 'Lỗi khi xóa bài viết', error: err.message });
  }
};

const getPostComments = async (req, res) => {
  try {
    const postId = req.params.id;
    const comments = await Comment.findAll({
      where: { post_id: postId },
      include: [
        {
          model: User,
          attributes: ['id', 'username'],
          include: {
            model: Profile,
            attributes: ['fullname', 'avatar_url']
          }
        }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy bình luận', error: err.message });
  }
};

const likePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    
    const post = await Post.findByPk(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    const existingLike = await Like.findOne({
      where: { post_id: postId, user_id: userId }
    });

    if (existingLike) {
      return res.status(400).json({ message: 'Bạn đã thích bài viết này rồi' });
    }

    const like = await Like.create({
      post_id: postId,
      user_id: userId,
      created_at: new Date()
    });

    res.json({ message: 'Thích bài viết thành công', like });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi thích bài viết', error: err.message });
  }
};

const unlikePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    
    const post = await Post.findByPk(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    const like = await Like.findOne({
      where: { post_id: postId, user_id: userId }
    });

    if (!like) {
      return res.status(404).json({ message: 'Bạn chưa thích bài viết này' });
    }

    await like.destroy();
    res.json({ message: 'Bỏ thích bài viết thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi bỏ thích bài viết', error: err.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    const { content, privacy } = req.body;

    console.log(`[UPDATE POST DEBUG] UserID: ${userId}, PostID: ${postId}`);

    const post = await Post.findByPk(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    
    console.log(`[UPDATE POST DEBUG] PostOwnerID: ${post.user_id}`);

    // Use loose equality or explicit conversion
    if (parseInt(post.user_id) !== parseInt(userId)) return res.status(403).json({ message: 'Không có quyền' });

    await post.update({
      content: content || post.content,
      privacy: privacy || post.privacy,
      updated_at: new Date()
    });

    res.json({ message: 'Cập nhật thành công', post });
  } catch (err) {
    console.error('[UPDATE POST ERROR]', err);
    res.status(500).json({ message: 'Lỗi cập nhật bài viết', error: err.message });
  }
};

module.exports = { createPost, getPost, listPosts, deletePost, getPostComments, likePost, unlikePost, updatePost };
