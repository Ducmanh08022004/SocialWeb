
const { Op } = require('sequelize');
const { Friendship, Notification, User } = require('../models');

const sendRequest = async (req, res) => {
  const userId = req.user.id;
  const { friend_id } = req.body;
  if (!friend_id) return res.status(400).json({ message: 'Thiếu friend_id' });
  if (friend_id === userId) return res.status(400).json({ message: 'Không thể kết bạn với chính mình' });

  let f = await Friendship.findOne({
    where: {
      [Op.or]: [
        { user_id: userId, friend_id },
        { user_id: friend_id, friend_id: userId }
      ]
    }
  });

  if (f) return res.status(409).json({ message: 'Đã gửi request trước đó' });

  const newF = await Friendship.create({ user_id: userId, friend_id, status: 'pending', created_at: new Date() });

  const notif = await Notification.create({ 
    receiver_id: friend_id, 
    sender_id: userId, 
    type: 'friend_request', 
    content: 'đã gửi lời mời kết bạn', 
    created_at: new Date(),
    metadata: { friendship_id: newF.id }
  });

  const io = req.app.get('socketio');
  if (io) {
    // Fetch sender profile
    const { Profile } = require('../models');
    const senderProfile = await Profile.findByPk(userId);

    io.to(`user_${friend_id}`).emit('new_notification', {
      id: notif.id,
      type: 'friend_request',
      content: notif.content,
      sender: {
        id: userId,
        username: req.user.username,
        Profile: senderProfile
      },
      created_at: notif.created_at,
      metadata: notif.metadata
    });
  }

  res.json({ friendship: newF });
};

const respondRequest = async (req, res) => {
  const userId = req.user.id;
  const { requestId, action } = req.body;
  const f = await Friendship.findByPk(requestId);
  if (!f) return res.status(404).json({ message: 'Không tìm thấy request' });
  
  // Permission checks based on action
  if (action === 'accept' || action === 'reject' || action === 'block') {
      // Only receiver can accept/reject/block
      if (f.friend_id !== userId) {
          return res.status(403).json({ message: 'Không đủ quyền' });
      }
  } else if (action === 'cancel') {
      // Only sender can cancel
      if (f.user_id !== userId) {
          return res.status(403).json({ message: 'Không đủ quyền' });
      }
  } else if (action === 'unfriend') {
      // Both can unfriend
      if (f.user_id !== userId && f.friend_id !== userId) {
          return res.status(403).json({ message: 'Không đủ quyền' });
      }
  } else {
      return res.status(400).json({ message: 'Action không hợp lệ' });
  }

  if (action === 'accept') {
    await f.update({ status: 'accepted', updated_at: new Date() });
    await Friendship.findOrCreate({ where: { user_id: userId, friend_id: f.user_id }, defaults: { status: 'accepted', created_at: new Date() } });
    // Xóa thông báo sau khi accept
    await Notification.destroy({ where: { sender_id: f.user_id, receiver_id: userId, type: 'friend_request' } });
    res.json({ message: 'Đã chấp nhận' });
  } else if (action === 'block') {
    await f.update({ status: 'blocked', updated_at: new Date() });
    // Xóa thông báo sau khi block
    await Notification.destroy({ where: { sender_id: f.user_id, receiver_id: userId, type: 'friend_request' } });
    res.json({ message: 'Đã chặn' });
  } else if (action === 'reject') {
    // Xóa thông báo lời mời kết bạn
    await Notification.destroy({ where: { sender_id: f.user_id, receiver_id: userId, type: 'friend_request' } });
    // Xóa lời mời kết bạn
    await f.destroy();
    res.json({ message: 'Đã từ chối' });
  } else if (action === 'cancel') {
    // Xóa thông báo lời mời kết bạn
    await Notification.destroy({ where: { sender_id: userId, receiver_id: f.friend_id, type: 'friend_request' } });
    // Xóa lời mời kết bạn
    await f.destroy();
    res.json({ message: 'Đã hủy lời mời' });
  } else if (action === 'unfriend') {
    // Xác định friendId là ai
    const friendId = f.user_id === userId ? f.friend_id : f.user_id;
    
    // Xóa cả hai phía của quan hệ bạn bè
    const deleted = await Friendship.destroy({ 
      where: { 
        [Op.or]: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId }
        ]
      } 
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: 'Không tìm thấy quan hệ bạn bè' });
    }
    
    res.json({ message: 'Đã hủy kết bạn' });
  } else {
    res.status(400).json({ message: 'Action không hợp lệ' });
  }
};

const listFriends = async (req, res) => {
  try {
    // Allow fetching friends for a specific user if userId query param is provided
    // Otherwise default to current user
    let targetUserId = req.user?.id || req.user?.dataValues?.id;
    
    if (req.query.userId && req.query.userId !== 'undefined' && req.query.userId !== 'null') {
        const parsed = parseInt(req.query.userId);
        if (!isNaN(parsed)) {
            targetUserId = parsed;
        }
    }
    
    if (!targetUserId) {
      console.error('[listFriends] No userId found. req.user:', req.user ? 'present' : 'missing', 'query:', req.query);
      return res.status(400).json({ message: 'Invalid user' });
    }
    
    console.log(`[listFriends] Fetching friends for user ${targetUserId}`);
    
    // Simple query: Get friendships
    const friendships = await Friendship.findAll({ 
      where: { user_id: targetUserId, status: 'accepted' },
      attributes: ['friend_id']
    });

    console.log(`[listFriends] Found ${friendships.length} friendships`);
    
    if (friendships.length === 0) {
      return res.json({ friends: [] });
    }

    // Get all friend IDs
    const friendIds = friendships.map(f => f.friend_id);
    
    // Fetch users with their profiles in one query
    const { Profile } = require('../models');
    const users = await User.findAll({
      where: { id: { [Op.in]: friendIds } },
      attributes: ['id', 'username'],
      include: [{
        model: Profile,
        attributes: ['fullname', 'avatar_url', 'avatar_thumbnail_url'],
        required: false
      }]
    });

    console.log(`[listFriends] Fetched ${users.length} user details`);

    // Format response
    const friends = users.map(user => ({
      friend_id: user.id,
      username: user.username,
      name: user.Profile?.fullname || user.username,
      avatar: user.Profile?.avatar_url || null,
      avatar_thumbnail: user.Profile?.avatar_thumbnail_url || null
    }));

    res.json({ friends });
  } catch (err) {
    console.error('[listFriends] Error:', err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};

const listPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find requests where I am the friend_id (receiver) and status is pending
    const requests = await Friendship.findAll({
      where: { friend_id: userId, status: 'pending' },
      include: [
        {
          model: User,
          as: 'sender', // The sender
          attributes: ['id', 'username'],
          include: [{
            model: require('../models').Profile,
            attributes: ['fullname', 'avatar_url']
          }]
        }
      ]
    });

    const formattedRequests = requests.map(req => ({
      requestId: req.id,
      senderId: req.sender.id,
      username: req.sender.username,
      name: req.sender.Profile?.fullname || req.sender.username,
      avatar: req.sender.Profile?.avatar_url,
      created_at: req.created_at
    }));

    res.json({ requests: formattedRequests });
  } catch (err) {
    console.error('Error listing pending requests:', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách lời mời', error: err.message });
  }
};

module.exports = { sendRequest, respondRequest, listFriends, listPendingRequests };
