import express from 'express';
import Message from '../models/Message.js';
import Channel from '../models/Channel.js';
import { authenticateToken } from '../middleware/auth.js';
import { moderateContent, calculateSpamScore } from '../utils/contentModeration.js';
import { io } from '../index.js';

const router = express.Router();

// Get channel messages
router.get('/channels/:id', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (!channel.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ 
      channel_id: req.params.id,
      deleted_at: null
    })
    .populate('user_id', 'username avatar_color')
    .sort({ created_at: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const reversedMessages = messages.reverse();
    console.log('Sending messages:', reversedMessages.map(m => ({
      id: m._id,
      content: m.content,
      created_at: m.created_at,
      created_at_type: typeof m.created_at,
      created_at_value: m.created_at,
      updated_at: m.updated_at,
      updated_at_type: typeof m.updated_at,
      user: m.user_id?.username
    })));

    // Ensure dates are properly formatted
    const formattedMessages = reversedMessages.map(message => {
      const messageObj = message.toObject({ 
        virtuals: true,
        getters: true,
        transform: (doc, ret) => {
          // Ensure timestamps are included
          if (ret.created_at) {
            ret.created_at = new Date(ret.created_at).toISOString();
          } else {
            ret.created_at = new Date().toISOString();
          }
          
          if (ret.updated_at) {
            ret.updated_at = new Date(ret.updated_at).toISOString();
          } else {
            ret.updated_at = new Date().toISOString();
          }
          
          return ret;
        }
      });
      
      console.log('Message object after formatting:', {
        id: messageObj._id,
        created_at: messageObj.created_at,
        updated_at: messageObj.updated_at,
        has_created_at: 'created_at' in messageObj,
        has_updated_at: 'updated_at' in messageObj
      });
      
      return messageObj;
    });

    res.json({ 
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/channels/:id', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (!channel.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get recent messages for spam checking
    const recentMessages = await Message.find({
      channel_id: req.params.id,
      created_at: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    }).sort({ created_at: -1 }).limit(20);

    // Check spam score
    const spamScore = calculateSpamScore(req.user, recentMessages);
    if (spamScore > 70) {
      return res.status(429).json({ message: 'Message rate limit exceeded' });
    }

    // Content moderation
    const moderation = moderateContent(content.trim());
    
    const message = new Message({
      channel_id: req.params.id,
      user_id: req.user._id,
      content: moderation.filtered,
      original_content: moderation.original,
      is_flagged: moderation.flagged,
      moderation_status: moderation.flagged ? 'auto_filtered' : 'approved'
    });

    console.log('Message schema options:', message.schema.options);
    console.log('Message timestamps enabled:', message.schema.options.timestamps);

    console.log('Message before save:', {
      id: message._id,
      content: message.content,
      created_at: message.created_at,
      updated_at: message.updated_at,
      has_created_at: 'created_at' in message,
      has_updated_at: 'updated_at' in message,
      schema_timestamps: message.schema.options.timestamps
    });

    await message.save();

    console.log('Message after save:', {
      id: message._id,
      content: message.content,
      created_at: message.created_at,
      updated_at: message.updated_at,
      has_created_at: 'created_at' in message,
      has_updated_at: 'updated_at' in message,
      isNew: message.isNew,
      modifiedPaths: message.modifiedPaths()
    });
    await message.populate('user_id', 'username avatar_color');

    // Update channel last activity
    channel.last_activity = new Date();
    await channel.save();

    // Emit to all channel members
    const populatedMessage = await Message.findById(message._id)
      .populate('user_id', 'username avatar_color');

    // Format message for response and emission
    const formattedMessage = populatedMessage.toObject({ 
      virtuals: true,
      getters: true,
      transform: (doc, ret) => {
        // Ensure timestamps are included
        if (ret.created_at) {
          ret.created_at = new Date(ret.created_at).toISOString();
        } else {
          ret.created_at = new Date().toISOString();
        }
        
        if (ret.updated_at) {
          ret.updated_at = new Date(ret.updated_at).toISOString();
        } else {
          ret.updated_at = new Date().toISOString();
        }
        
        return ret;
      }
    });

    channel.members.forEach(member => {
      io.to(`user-${member.user}`).emit('new-message', formattedMessage);
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: formattedMessage,
      moderation: moderation.flagged ? { flagged: true, reason: moderation.reason } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Flag message
router.put('/:id/flag', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user can access this message
    const channel = await Channel.findById(message.channel_id);
    if (!channel.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if already flagged by this user
    const alreadyFlagged = message.flagged_by.some(
      flag => flag.user.toString() === req.user._id.toString()
    );

    if (alreadyFlagged) {
      return res.status(400).json({ message: 'Message already flagged by you' });
    }

    message.flagged_by.push({
      user: req.user._id,
      reason: reason || 'inappropriate content'
    });
    message.is_flagged = true;

    await message.save();

    res.json({ message: 'Message flagged successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete message
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Delete request for message:', req.params.id);
    console.log('User attempting delete:', req.user._id, req.user.role);
    
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      console.log('Message not found');
      return res.status(404).json({ message: 'Message not found' });
    }

    console.log('Message found:', {
      id: message._id,
      user_id: message.user_id,
      channel_id: message.channel_id
    });

    const channel = await Channel.findById(message.channel_id);
    
    if (!channel) {
      console.log('Channel not found');
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check permissions (author, channel admin, or moderator/admin)
    const isAuthor = message.user_id.toString() === req.user._id.toString();
    const isChannelAdmin = channel.isAdmin(req.user._id);
    const isModerator = ['moderator', 'admin'].includes(req.user.role);
    
    console.log('Permission check:', {
      isAuthor,
      isChannelAdmin,
      isModerator,
      userRole: req.user.role
    });

    const canDelete = isAuthor || isChannelAdmin || isModerator;

    if (!canDelete) {
      console.log('Access denied for delete');
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('Deleting message...');
    message.deleted_at = new Date();
    await message.save();

    // Emit deletion to all channel members
    io.to(`channel-${message.channel_id}`).emit('message-deleted', { messageId: message._id });
    
    console.log('Emitted message-deleted event to channel:', message.channel_id);
    
    // Debug: Check which rooms exist and how many users are in them
    const channelRoom = `channel-${message.channel_id}`;
    const room = io.sockets.adapter.rooms.get(channelRoom);
    console.log(`Channel room ${channelRoom} has ${room ? room.size : 0} users`);
    
    // Debug: Check all rooms
    console.log('All active rooms:', Array.from(io.sockets.adapter.rooms.keys()));

    console.log('Message deleted successfully');
    
    // Test: Also emit to individual users as backup
    channel.members.forEach(member => {
      io.to(`user-${member.user}`).emit('message-deleted', { messageId: message._id });
    });
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;