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

    res.json({ 
      messages: messages.reverse(),
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

    await message.save();
    await message.populate('user_id', 'username avatar_color');

    // Update channel last activity
    channel.last_activity = new Date();
    await channel.save();

    // Emit to all channel members
    const populatedMessage = await Message.findById(message._id)
      .populate('user_id', 'username avatar_color');

    channel.members.forEach(member => {
      io.to(`user-${member.user}`).emit('new-message', populatedMessage);
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: populatedMessage,
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
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const channel = await Channel.findById(message.channel_id);
    
    // Check permissions (author, channel admin, or moderator/admin)
    const canDelete = message.user_id.toString() === req.user._id.toString() ||
                     channel.isAdmin(req.user._id) ||
                     ['moderator', 'admin'].includes(req.user.role);

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.deleted_at = new Date();
    await message.save();

    // Emit deletion to channel members
    channel.members.forEach(member => {
      io.to(`user-${member.user}`).emit('message-deleted', { messageId: message._id });
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;