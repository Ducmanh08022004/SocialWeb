
const { Notification, User, Profile } = require('../models');

const listNotifications = async (req, res) => {
  const userId = req.user.id;
  const notifications = await Notification.findAll({ 
    where: { receiver_id: userId }, 
    include: [
      { 
        model: User, 
        as: 'sender', 
        attributes: ['id', 'username'],
        include: [
          { 
            model: Profile, 
            attributes: ['fullname', 'avatar_url', 'avatar_thumbnail_url']
          }
        ]
      }
    ],
    order: [['created_at','DESC']] 
  });
  res.json({ notifications });
};

const markRead = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const n = await Notification.findByPk(id);
  if (!n) return res.status(404).json({ message: 'Không tìm thấy' });
  if (n.receiver_id !== userId) return res.status(403).json({ message: 'Không có quyền' });
  await n.update({ is_read: true });
  res.json({ message: 'Đã đánh dấu là đã đọc' });
};

module.exports = { listNotifications, markRead };
