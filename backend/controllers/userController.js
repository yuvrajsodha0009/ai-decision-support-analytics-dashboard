const bcrypt = require("bcryptjs");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const trimmedName = req.body?.name?.trim();

    if (!trimmedName) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (trimmedName.length < 2) {
      return res
        .status(400)
        .json({ message: "Name must be at least 2 characters long" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name: trimmedName },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const currentPassword = req.body?.currentPassword?.trim();
    const newPassword = req.body?.newPassword?.trim();

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Failed to change password" });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    if (user.avatar && user.avatar.startsWith("/uploads/avatars/")) {
      const relativePath = user.avatar.replace(/^\/+/, "");
      const previousPath = path.join(__dirname, "..", relativePath);
      fs.promises.unlink(previousPath).catch(() => {});
    }

    user.avatar = avatarPath;
    await user.save();

    const safeUser = await User.findById(req.userId).select("-password");
    res.json({
      message: "Profile picture updated successfully",
      avatar: avatarPath,
      user: safeUser,
    });
  } catch (err) {
    console.error("Update avatar error:", err);
    res.status(500).json({ message: "Failed to update profile picture" });
  }
};
