const { Story, User, Profile, Friendship } = require('../models');
const { Op } = require('sequelize');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

exports.createStory = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let mediaUrl = '';
    let mediaType = 'image';

    // Determine type from file
    if (file.mimetype.startsWith('video/')) {
        mediaType = 'video';
    }

    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                   process.env.CLOUDINARY_API_KEY && 
                                   process.env.CLOUDINARY_API_SECRET;

    if (isCloudinaryConfigured) {
        try {
            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(file.path, {
              resource_type: 'auto',
              folder: 'stories'
            });
            
            mediaUrl = result.secure_url;
            // Use Cloudinary's detected type if available, otherwise stick to ours
            if (result.resource_type === 'video') mediaType = 'video';
            
            // Remove local file on success
            try { fs.unlinkSync(file.path); } catch (e) {}
            
        } catch (uploadError) {
            console.error('Cloudinary upload failed, falling back to local:', uploadError.message);
            // Fallback to local
            mediaUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        }
    } else {
        // Use local
        mediaUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    }
    
    const story = await Story.create({
      user_id: userId,
      media_url: mediaUrl,
      media_type: mediaType,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    res.json({ story });
  } catch (err) {
    console.error('Create story error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getStories = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get friends IDs
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { user_id: userId, status: 'accepted' },
          { friend_id: userId, status: 'accepted' }
        ]
      }
    });

    const friendIds = friendships.map(f => 
      f.user_id === userId ? f.friend_id : f.user_id
    );

    // Include current user
    friendIds.push(userId);

    // Fetch active stories
    const stories = await Story.findAll({
      where: {
        user_id: { [Op.in]: friendIds },
        expires_at: { [Op.gt]: new Date() }
      },
      include: [{
        model: User,
        attributes: ['id', 'username'],
        include: [{
          model: Profile,
          attributes: ['fullname', 'avatar_url']
        }]
      }],
      order: [['created_at', 'ASC']]
    });

    // Group stories by user
    const groupedStories = {};
    stories.forEach(story => {
      const uid = story.user_id;
      if (!groupedStories[uid]) {
        groupedStories[uid] = {
          user: story.User,
          stories: []
        };
      }
      groupedStories[uid].stories.push(story);
    });

    res.json({ 
      data: Object.values(groupedStories) 
    });
  } catch (err) {
    console.error('Get stories error:', err);
    res.status(500).json({ message: err.message });
  }
};
