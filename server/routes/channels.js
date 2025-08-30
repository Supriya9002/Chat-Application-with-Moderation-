import express from 'express';
import Channel from '../models/Channel.js';
import Message from '../models/Message.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Create channel
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, is_private } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Channel name is required' });
    }

    // Check if channel name exists
    const existingChannel = await Channel.findOne({ name: name.trim() });
    if (existingChannel) {
      return res.status(400).json({ message: 'Channel name already exists' });
    }

    const channel = new Channel({
      name: name.trim(),
      description: description?.trim() || '',
      is_private: is_private || false,
      created_by: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin'
      }]
    });

    await channel.save();
    await channel.populate('created_by', 'username avatar_color');
    await channel.populate('members.user', 'username avatar_color is_online');

    res.status(201).json({
      message: 'Channel created successfully',
      channel
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's channels
router.get('/', authenticateToken, async (req, res) => {
  try {
    const channels = await Channel.find({
      'members.user': req.user._id
    })
    .populate('created_by', 'username avatar_color')
    .populate('members.user', 'username avatar_color is_online')
    .sort({ last_activity: -1 });

    res.json({ channels });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public channels
router.get('/public', authenticateToken, async (req, res) => {
  try {
    const channels = await Channel.find({ 
      is_private: false,
      'members.user': { $ne: req.user._id }
    })
    .populate('created_by', 'username avatar_color')
    .select('name description created_by members created_at')
    .limit(20)
    .sort({ created_at: -1 });

    res.json({ channels });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Join channel
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (channel.is_private) {
      return res.status(403).json({ message: 'Cannot join private channel' });
    }

    if (channel.isMember(req.user._id)) {
      return res.status(400).json({ message: 'Already a member of this channel' });
    }

    channel.members.push({
      user: req.user._id,
      role: 'member'
    });

    await channel.save();
    await channel.populate('members.user', 'username avatar_color is_online');

    res.json({
      message: 'Joined channel successfully',
      channel
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave channel
router.delete('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (!channel.isMember(req.user._id)) {
      return res.status(400).json({ message: 'Not a member of this channel' });
    }

    // Don't allow the creator to leave
    if (channel.created_by.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Channel creator cannot leave' });
    }

    channel.members = channel.members.filter(
      member => member.user.toString() !== req.user._id.toString()
    );

    await channel.save();

    res.json({ message: 'Left channel successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get channel members
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('members.user', 'username avatar_color is_online last_seen');
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (!channel.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ members: channel.members });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;