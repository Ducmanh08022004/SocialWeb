require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');

const { sequelize, Conversation, ConversationMember, Message, MessageReceipt } = require('./models');

// ROUTES
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendshipRoutes = require('./routes/friendships');
const postRoutes = require('./routes/posts');
const likeRoutes = require('./routes/likes');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');
const aiRoutes = require('./routes/ai');


const app = express();
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friendships', friendshipRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => res.send('Social API running'));
console.log("Cloudinary:", process.env.CLOUDINARY_CLOUD_NAME);

// ---------------------------------------
//  TẠO HTTP SERVER + SOCKET.IO SERVER
// ---------------------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// Make io accessible to our router
app.set('socketio', io);

// Map userId → Set(socketId)
const onlineUsers = new Map();

function addUser(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function removeUser(userId, socketId) {
  if (!onlineUsers.has(userId)) return;
  onlineUsers.get(userId).delete(socketId);
  if (onlineUsers.get(userId).size === 0) onlineUsers.delete(userId);
}

// ---------------------------------------
//  Middleware xác thực token cho socket
// ---------------------------------------
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing token'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;

    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

// ---------------------------------------
//  WebSocket Events
// ---------------------------------------
io.on('connection', (socket) => {
  const userId = socket.userId;
  addUser(userId, socket.id);
  
  // Join a personal room for notifications
  socket.join(`user_${userId}`);

  console.log(`User ${userId} connected. Total: ${onlineUsers.size}`);

  // broadcast online status
  io.emit('user_status', { userId, status: 'online' });

  // Join room
  socket.on("join_conversation", (conversationId) => {
    console.log(`✋ User ${userId} joining conversation ${conversationId}`);
    socket.join("conv_" + conversationId);
    console.log(`✅ User ${userId} joined room: conv_${conversationId}`);
  });

  socket.on("leave_conversation", (conversationId) => {
    console.log(`👋 User ${userId} leaving conversation ${conversationId}`);
    socket.leave("conv_" + conversationId);
  });

  // Typing
  socket.on("typing", ({ conversationId, isTyping }) => {
    socket.to("conv_" + conversationId).emit("typing", {
      userId,
      conversationId,
      isTyping,
    });
  });

  // Gửi tin nhắn
  socket.on("send_message", async ({ conversationId, content, type }) => {
    try {
      console.log(`📤 User ${userId} sending message to conversation ${conversationId}: "${content}"`);
      
      const message = await Message.create({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        type: type || "text",
        created_at: new Date(),
      });

      console.log(`💾 Message saved with ID ${message.id}`);

      // Update conversation updated_at to sort correctly
      await Conversation.update(
        { updated_at: new Date() },
        { where: { id: conversationId } }
      );

      // Gửi tới phòng
      console.log(`📢 Broadcasting message to room: conv_${conversationId}`);
      io.to("conv_" + conversationId).emit("receive_message", message);
      console.log(`✅ Message broadcast completed`);

      // Gửi "delivered" receipts
      const members = await ConversationMember.findAll({ where: { conversation_id: conversationId } });

      const receipts = members
        .filter(m => m.user_id !== userId)
        .map(m => ({
          message_id: message.id,
          user_id: m.user_id,
          status: "delivered",
          updated_at: new Date()
        }));

      if (receipts.length) {
        await MessageReceipt.bulkCreate(receipts);
      }

      // thông báo tới từng user
      for (const m of members) {
        if (m.user_id === userId) continue;
        if (!onlineUsers.has(m.user_id)) continue;

        for (const sId of onlineUsers.get(m.user_id)) {
          io.to(sId).emit("message_notification", {
            conversationId,
            message
          });
        }
      }

    } catch (err) {
      console.error("❌ Error sending message:", err);
      socket.emit("error_message", { message: "Cannot send message" });
    }
  });

  // Seen messages
  socket.on("message_seen", async ({ conversationId, messageIds }) => {
    try {
      for (const id of messageIds) {
        await MessageReceipt.upsert({
          message_id: id,
          user_id: userId,
          status: "read",
          updated_at: new Date(),
        });
      }

      io.to("conv_" + conversationId).emit("message_seen", {
        userId,
        conversationId,
        messageIds
      });
    } catch (err) {
      console.log("Seen error:", err);
    }
  });

  socket.on('disconnect', () => {
    removeUser(userId, socket.id);

    if (!onlineUsers.has(userId)) {
      io.emit('user_status', { userId, status: 'offline' });
    }

    console.log(`User ${userId} disconnected.`);
  });
});

// ---------------------------------------
//  Khởi động server
// ---------------------------------------

const PORT = process.env.PORT || 3000;
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected.');

    // Run migrations
    console.log('Running migrations...');
    try {
      const QueryInterface = sequelize.getQueryInterface();
      const { DataTypes } = require('sequelize');
      
      // Fix conversations table - Add updated_at if missing
      console.log('Checking conversations table...');
      const conversationsTable = await QueryInterface.describeTable('conversations');
      if (!conversationsTable.updated_at) {
        console.log('  Adding updated_at column to conversations...');
        await QueryInterface.addColumn('conversations', 'updated_at', {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          allowNull: true
        });
        console.log('  ✅ Added updated_at column');
      } else {
        console.log('  ✅ updated_at column exists');
      }

      // Fix profiles table - Add missing columns
      console.log('Checking profiles table...');
      const profilesTable = await QueryInterface.describeTable('profiles');
      
      const profileColumnsToAdd = [
        { name: 'avatar_type', type: DataTypes.ENUM('image', 'model3d'), default: 'image' },
        { name: 'avatar_public_id', type: DataTypes.STRING(255), default: null },
        { name: 'cover_url', type: DataTypes.STRING(255), default: null },
        { name: 'cover_public_id', type: DataTypes.STRING(255), default: null },
        { name: 'birthday', type: DataTypes.DATEONLY, default: null },
        { name: 'gender', type: DataTypes.ENUM('male', 'female', 'other'), default: null },
        { name: 'updated_at', type: DataTypes.DATE, default: null }
      ];

      for (const col of profileColumnsToAdd) {
        if (!profilesTable[col.name]) {
          console.log(`  Adding ${col.name} column...`);
          await QueryInterface.addColumn('profiles', col.name, {
            type: col.type,
            allowNull: true
          });
          console.log(`  ✅ Added ${col.name}`);
        }
      }
      console.log('✅ Profile table is up to date');

      // Fix post_media table - Ensure type ENUM includes all values
      console.log('Checking post_media table...');
      const postMediaTable = await QueryInterface.describeTable('post_media');
      
      // Check if type column exists and has correct ENUM values
      if (postMediaTable.type) {
        const typeInfo = postMediaTable.type;
        // If type column exists but doesn't include 'model3d', we need to fix it
        if (typeInfo.type && !typeInfo.type.includes('model3d')) {
          console.log('  Updating type ENUM to include model3d...');
          await QueryInterface.changeColumn('post_media', 'type', {
            type: DataTypes.ENUM('image', 'video', 'model3d'),
            allowNull: true
          });
          console.log('  ✅ Updated type ENUM');
        } else {
          console.log('  ✅ type ENUM is correct');
        }
      }
      console.log('✅ Post_media table is up to date');

    } catch (migrationErr) {
      console.log('⚠️ Migration note:', migrationErr.message);
    }

    server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Unable to start server:', err);
    process.exit(1);
  }
})();
