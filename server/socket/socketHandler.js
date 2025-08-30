import Message from '../models/Message.js';
import Channel from '../models/Channel.js';
import User from '../models/User.js';
import { moderateContent, calculateSpamScore } from '../utils/contentModeration.js';

const userSockets = new Map();
const typingUsers = new Map();

export const handleSocketConnection = (io, socket) => {
  console.log(`User ${socket.user.username} connected`);
  
  // Store socket connection
  userSockets.set(socket.userId, socket.id);
  
  // Join user to their personal room
  socket.join(`user-${socket.userId}`);
  
  // Update user online status
  updateUserOnlineStatus(socket.userId, true);
  
  // Join user to their channels
  joinUserChannels(socket);
  
  // Handle typing events
  socket.on('typing', (data) => {
    handleTyping(io, socket, data, true);
  });
  
  socket.on('stop-typing', (data) => {
    handleTyping(io, socket, data, false);
  });
  
  // Handle real-time messaging
  socket.on('send-message', async (data) => {
    await handleRealTimeMessage(io, socket, data);
  });
  
  // Handle joining channels
  socket.on('join-channel', async (channelId) => {
    await handleJoinChannel(socket, channelId);
  });
  
  // Handle leaving channels
  socket.on('leave-channel', (channelId) => {
    socket.leave(`channel-${channelId}`);
  });
  
  // Handle user activity
  socket.on('user-activity', () => {
    updateUserLastSeen(socket.userId);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    handleDisconnection(socket);
  });
};

const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    await User.findByIdAndUpdate(userId, { 
      is_online: isOnline,
      last_seen: new Date()
    });
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};

const joinUserChannels = async (socket) => {
  try {
    const channels = await Channel.find({ 'members.user': socket.userId });
    channels.forEach(channel => {
      socket.join(`channel-${channel._id}`);
    });
  } catch (error) {
    console.error('Error joining channels:', error);
  }
};

const handleTyping = (io, socket, data, isTyping) => {
  const { channelId } = data;
  const key = `${channelId}-${socket.userId}`;
  
  if (isTyping) {
    typingUsers.set(key, {
      userId: socket.userId,
      username: socket.user.username,
      channelId,
      timestamp: Date.now()
    });
  } else {
    typingUsers.delete(key);
  }
  
  // Get all typing users for this channel
  const channelTypingUsers = Array.from(typingUsers.values())
    .filter(user => user.channelId === channelId && user.userId !== socket.userId)
    .map(user => ({ userId: user.userId, username: user.username }));
  
  // Broadcast typing status to channel
  socket.to(`channel-${channelId}`).emit('typing-update', {
    channelId,
    typingUsers: channelTypingUsers
  });
};

const handleRealTimeMessage = async (io, socket, data) => {
  try {
    const { channelId, content } = data;
    
    if (!content || content.trim().length === 0) {
      return socket.emit('error', { message: 'Message content is required' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel || !channel.isMember(socket.userId)) {
      return socket.emit('error', { message: 'Access denied' });
    }

    // Get recent messages for spam checking
    const recentMessages = await Message.find({
      channel_id: channelId,
      created_at: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    }).sort({ created_at: -1 }).limit(20);

    // Check spam score
    const spamScore = calculateSpamScore(socket.user, recentMessages);
    if (spamScore > 70) {
      return socket.emit('error', { message: 'Message rate limit exceeded' });
    }

    // Content moderation
    const moderation = moderateContent(content.trim());
    
    const message = new Message({
      channel_id: channelId,
      user_id: socket.userId,
      content: moderation.filtered,
      original_content: moderation.original,
      is_flagged: moderation.flagged,
      moderation_status: moderation.flagged ? 'auto_filtered' : 'approved'
    });

    await message.save();
    await message.populate('user_id', 'username avatar_color');

    // Update channel last activity
    channel.last_activity = new Date();
    await channel.save();

    // Clear typing status
    const typingKey = `${channelId}-${socket.userId}`;
    typingUsers.delete(typingKey);

    // Emit to all channel members
    io.to(`channel-${channelId}`).emit('new-message', message);
    
    // Send confirmation to sender
    socket.emit('message-sent', { 
      messageId: message._id,
      moderation: moderation.flagged ? { flagged: true, reason: moderation.reason } : null
    });

  } catch (error) {
    console.error('Error handling real-time message:', error);
    socket.emit('error', { message: 'Failed to send message' });
  }
};

const handleJoinChannel = async (socket, channelId) => {
  try {
    const channel = await Channel.findById(channelId);
    if (channel && channel.isMember(socket.userId)) {
      socket.join(`channel-${channelId}`);
      socket.emit('channel-joined', { channelId });
    }
  } catch (error) {
    console.error('Error joining channel:', error);
  }
};

const updateUserLastSeen = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { last_seen: new Date() });
  } catch (error) {
    console.error('Error updating last seen:', error);
  }
};

const handleDisconnection = (socket) => {
  console.log(`User ${socket.user.username} disconnected`);
  
  // Update user offline status
  updateUserOnlineStatus(socket.userId, false);
  
  // Clear typing status
  for (const [key, value] of typingUsers.entries()) {
    if (value.userId === socket.userId) {
      typingUsers.delete(key);
    }
  }
  
  // Remove from user sockets
  userSockets.delete(socket.userId);
};

// Clean up old typing indicators
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of typingUsers.entries()) {
    if (now - value.timestamp > 10000) { // 10 seconds timeout
      typingUsers.delete(key);
    }
  }
}, 5000);