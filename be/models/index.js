
const sequelize = require('../config/database');
const User = require('./user');
const Profile = require('./profile');
const Friendship = require('./friendship');
const Post = require('./post');
const PostMedia = require('./postMedia');
const Like = require('./like');
const Comment = require('./comment');
const Notification = require('./notification');
const Conversation = require('./conversation');
const ConversationMember = require('./conversationMember');
const Message = require('./message');
const MessageReceipt = require('./messageReceipt');
const Story = require('./story');

User.initModel(sequelize);
Profile.initModel(sequelize);
Friendship.initModel(sequelize);
Post.initModel(sequelize);
PostMedia.initModel(sequelize);
Like.initModel(sequelize);
Comment.initModel(sequelize);
Notification.initModel(sequelize);
Conversation.initModel(sequelize);
ConversationMember.initModel(sequelize);
Message.initModel(sequelize);
MessageReceipt.initModel(sequelize);
Story.initModel(sequelize);

// Associations
User.hasOne(Profile, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Story, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Story.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Post, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Post.belongsTo(User, { foreignKey: 'user_id' });

Post.hasMany(PostMedia, { foreignKey: 'post_id', onDelete: 'CASCADE', as: 'media' });
PostMedia.belongsTo(Post, { foreignKey: 'post_id' });

Post.hasMany(Comment, { foreignKey: 'post_id', onDelete: 'CASCADE' });
Comment.belongsTo(Post, { foreignKey: 'post_id' });

User.hasMany(Comment, { foreignKey: 'user_id' , onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

Post.hasMany(Like, { foreignKey: 'post_id', onDelete: 'CASCADE' });
Like.belongsTo(Post, { foreignKey: 'post_id' });

User.hasMany(Like, { foreignKey: 'user_id' , onDelete: 'CASCADE' });
Like.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Friendship, { foreignKey: 'user_id', as: 'sentRequests' , onDelete: 'CASCADE' });
User.hasMany(Friendship, { foreignKey: 'friend_id', as: 'receivedRequests' , onDelete: 'CASCADE' });
Friendship.belongsTo(User, { foreignKey: 'user_id', as: 'sender' });
Friendship.belongsTo(User, { foreignKey: 'friend_id', as: 'receiver' });

User.hasMany(Notification, { foreignKey: 'receiver_id', as: 'notifications' , onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });
Notification.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// Chat associations
Conversation.hasMany(ConversationMember, {
  foreignKey: 'conversation_id',
  onDelete: 'CASCADE'
});

ConversationMember.belongsTo(Conversation, {
  foreignKey: 'conversation_id'
});

ConversationMember.belongsTo(User, {
  foreignKey: 'user_id'
});

User.hasMany(ConversationMember, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE'
});

Conversation.hasMany(Message, {
  foreignKey: 'conversation_id',
  onDelete: 'CASCADE'
});

Message.belongsTo(Conversation, {
  foreignKey: 'conversation_id'
});

Message.hasMany(MessageReceipt, {
  foreignKey: 'message_id',
  as: 'receipts',
  onDelete: 'CASCADE'
});
MessageReceipt.belongsTo(Message, {
  foreignKey: 'message_id'
});


module.exports = {
  sequelize,
  User,
  Profile,
  Friendship,
  Post,
  PostMedia,
  Like,
  Comment,
  Notification,
  Conversation,
  ConversationMember,
  Message,
  MessageReceipt,
  Story
};
