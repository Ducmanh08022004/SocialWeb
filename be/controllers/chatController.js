const { Conversation, ConversationMember, Message } = require('../models');
const { Op } = require('sequelize');

// Tạo hoặc lấy conversation private 1-1
exports.createPrivateConversation = async (req, res) => {
  try {
    const myId = req.user.id;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId required' });
    }

    if (userId === myId) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }

    // Find all conversations where I'm a member
    const myConversations = await ConversationMember.findAll({
      where: { user_id: myId },
      attributes: ['conversation_id']
    });

    const myConvIds = myConversations.map(c => c.conversation_id);

    if (myConvIds.length > 0) {
      // Find conversations where other user is also a member
      const sharedConversations = await ConversationMember.findAll({
        where: {
          conversation_id: { [Op.in]: myConvIds },
          user_id: userId
        },
        attributes: ['conversation_id']
      });

      if (sharedConversations.length > 0) {
        const existingConv = await Conversation.findByPk(sharedConversations[0].conversation_id);
        if (existingConv && existingConv.type === 'private') {
          return res.json({ conversation: existingConv });
        }
      }
    }

    // Create new private conversation
    const conv = await Conversation.create({ type: 'private' });
    await ConversationMember.bulkCreate([
      { conversation_id: conv.id, user_id: myId },
      { conversation_id: conv.id, user_id: userId }
    ]);

    res.json({ conversation: conv });
  } catch (err) {
    console.error('Error creating private conversation:', err);
    res.status(500).json({ message: err.message });
  }
};

// Tạo nhóm
exports.createGroupConversation = async (req, res) => {
  try {
    const myId = req.user.id;
    const { name, users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'Users required' });
    }

    const conv = await Conversation.create({
      type: 'group',
      name: name || null
    });

    const members = users.map(u => ({
      conversation_id: conv.id,
      user_id: u
    }));

    members.push({
      conversation_id: conv.id,
      user_id: myId
    });

    await ConversationMember.bulkCreate(members);

    res.json({ conversation: conv });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy tin nhắn theo ConversationId
exports.getMessages = async (req, res) => {
  try {
    const convId = parseInt(req.params.conversationId);

    const member = await ConversationMember.findOne({
      where: {
        conversation_id: convId,
        user_id: req.user.id
      }
    });

    if (!member) return res.status(403).json({ message: 'No access' });

    const messages = await Message.findAll({
      where: { conversation_id: convId },
      order: [['created_at', 'ASC']],
      limit: 1000
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy danh sách conversations của user
exports.getConversations = async (req, res) => {
  try {
    const myId = req.user.id;
    const { User } = require('../models');
    
    console.log(`Fetching conversations for user ${myId}`);
    
    // Step 1: Tìm tất cả conversations mà user là member
    const memberOf = await ConversationMember.findAll({
      where: { user_id: myId },
      attributes: ['conversation_id'],
      raw: true
    });

    const conversationIds = memberOf.map(m => m.conversation_id);
    console.log(`User is member of ${conversationIds.length} conversations`);
    
    if (conversationIds.length === 0) {
      return res.json({ data: [] });
    }

    // Step 2: Lấy conversations cơ bản
    const conversations = await Conversation.findAll({
      where: { id: { [Op.in]: conversationIds } },
      order: [['created_at', 'DESC']],
      limit: 50
    });

    console.log(`Found ${conversations.length} conversations`);

    // Step 3: Lấy members + User info từng conversation
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        try {
          // Lấy members của conversation này
          const members = await ConversationMember.findAll({
            where: { conversation_id: conv.id },
            include: [
              {
                model: User,
                attributes: ['id', 'username'],
                include: [{
                  model: require('../models').Profile,
                  attributes: ['avatar_url', 'avatar_thumbnail_url', 'fullname']
                }]
              }
            ]
          });

          // Lấy tin nhắn cuối cùng
          const lastMessage = await Message.findOne({
            where: { conversation_id: conv.id },
            attributes: ['id', 'content', 'created_at', 'sender_id'],
            order: [['created_at', 'DESC']]
          });

          // Tìm user kia (trong private conversation)
          let name = conv.name;
          let otherUserId = null;
          let otherUserAvatar = null;
          let otherUserAvatarThumbnail = null;

          if (conv.type === 'private') {
            const otherMember = members.find(m => m.user_id !== myId);
            if (otherMember && otherMember.User) {
              otherUserId = otherMember.user_id;
              name = otherMember.User.Profile?.fullname || otherMember.User.username || `User ${otherUserId}`;
              otherUserAvatar = otherMember.User.Profile?.avatar_url || null;
              otherUserAvatarThumbnail = otherMember.User.Profile?.avatar_thumbnail_url || null;
            }
          }

          return {
            id: conv.id,
            type: conv.type,
            name,
            otherUserId,
            otherUserAvatar,
            otherUserAvatarThumbnail,
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              content: lastMessage.content,
              createdAt: lastMessage.created_at
            } : null,
            unreadCount: 0,
            createdAt: conv.created_at,
            updatedAt: conv.updated_at || conv.created_at
          };
        } catch (err) {
          console.error(`Error enriching conversation ${conv.id}:`, err);
          return null;
        }
      })
    );

    // Filter out null values
    const validConversations = enrichedConversations.filter(c => c !== null);
    
    res.json({ data: validConversations });
  } catch (err) {
    console.error('Error fetching conversations:', err.message, err.stack);
    res.status(500).json({ message: err.message });
  }
};
