import express from "express";
import User from "../models/User.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get current user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile (only username)
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findById(req.user._id);

    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: "Invalid username length" });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ message: "Invalid username format" });
    }

    user.username = username;
    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_color: user.avatar_color,
      },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.username) {
      res.status(400).json({ message: "Username already taken" });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
});

// Get online users
router.get("/online", authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ is_online: true })
      .select("username avatar_color last_seen")
      .limit(50);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
