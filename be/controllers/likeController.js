
const { Like, Notification, Post } = require('../models');

const likePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { post_id, reaction } = req.body;
    if (!post_id) return res.status(400).json({ message: 'Thiếu post_id' });

    // Lấy post để tìm owner
    //jvvhjhbjhbhbhjh
    const post = await Post.findByPk(post_id);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    let [like, created] = await Like.findOrCreate({
      where: { user_id: userId, post_id },
      defaults: { reaction, created_at: new Date() }
    });
    if (!created) {
      await like.update({ reaction, created_at: new Date() });
    }

    // Tạo notification cho post owner (nếu không phải chính họ)
    if (post.user_id !== userId) {
      console.log(`[Like] Creating notification for user ${post.user_id} from ${userId}`);
      const notif = await Notification.create({ 
        receiver_id: post.user_id, 
        sender_id: userId, 
        type: 'like', 
        content: 'đã thích bài viết của bạn', 
        created_at: new Date(),
        metadata: { post_id }
      });
      console.log(`[Like] Notification created: ${notif.id}`);

      // Fetch sender profile for better notification UI
      const { Profile } = require('../models');
      const senderProfile = await Profile.findByPk(userId);

      const io = req.app.get('socketio');
      if (io) {
        console.log(`[Like] Emitting socket event to room user_${post.user_id}`);
        io.to(`user_${post.user_id}`).emit('new_notification', {
          id: notif.id,
          type: 'like',
          content: notif.content,
          sender: {
            id: userId,
            username: req.user.username,
            Profile: senderProfile
          },
          created_at: notif.created_at,
          metadata: notif.metadata
        });
      } else {
        console.error('[Like] SocketIO instance not found in app');
      }
    }

    res.json({ like });
  } catch (err) {
    console.error('Lỗi like post:', err);
    res.status(500).json({ message: 'Lỗi like bài viết', error: err.message });
  }
};

const unlikePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { post_id } = req.body;
    const like = await Like.findOne({ where: { user_id: userId, post_id } });
    if (!like) return res.status(404).json({ message: 'Chưa thích trước đó' });
    await like.destroy();
    res.json({ message: 'Bỏ thích thành công' });
  } catch (err) {
    console.error('Lỗi unlike post:', err);
    res.status(500).json({ message: 'Lỗi bỏ thích bài viết', error: err.message });
  }
};

module.exports = { likePost, unlikePost };
