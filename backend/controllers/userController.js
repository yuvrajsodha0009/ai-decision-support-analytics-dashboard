const bcrypt = require("bcryptjs");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");

const ANALYTICS_DATE_PRESETS = ["today", "last7", "last30", "last90", "custom"];

const getPresetRange = (preset) => {
  const now = new Date();
  const dayEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  if (preset === "today") {
    const dayStart = new Date(dayEnd);
    dayStart.setUTCHours(0, 0, 0, 0);
    return {
      start: dayStart.toISOString(),
      end: dayEnd.toISOString(),
    };
  }

  const presetDays = {
    last7: 7,
    last30: 30,
    last90: 90,
  };

  const totalDays = presetDays[preset] || 7;
  const start = new Date(dayEnd);
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));
  start.setUTCHours(0, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: dayEnd.toISOString(),
  };
};

const sameInstant = (left, right) => {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
};

const inferPresetFromRange = (startIso, endIso) => {
  for (const preset of ["today", "last7", "last30", "last90"]) {
    const range = getPresetRange(preset);
    if (sameInstant(startIso, range.start) && sameInstant(endIso, range.end)) {
      return preset;
    }
  }

  return "custom";
};

const normalizeAnalyticsDateRangePreference = (input = {}) => {
  const rawPreset =
    typeof input.preset === "string" ? input.preset.trim().toLowerCase() : "";

  if (rawPreset && !ANALYTICS_DATE_PRESETS.includes(rawPreset)) {
    return null;
  }

  if (rawPreset && rawPreset !== "custom") {
    const presetRange = getPresetRange(rawPreset);
    return {
      preset: rawPreset,
      start: presetRange.start,
      end: presetRange.end,
    };
  }

  if (!input.start || !input.end) {
    if (rawPreset === "custom") {
      return null;
    }

    const defaultRange = getPresetRange("last7");
    return {
      preset: "last7",
      start: defaultRange.start,
      end: defaultRange.end,
    };
  }

  const start = new Date(input.start);
  const end = new Date(input.end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  let normalizedStart = start.toISOString();
  let normalizedEnd = end.toISOString();

  if (start.getTime() > end.getTime()) {
    normalizedStart = end.toISOString();
    normalizedEnd = start.toISOString();
  }

  if (rawPreset === "custom") {
    return {
      preset: "custom",
      start: normalizedStart,
      end: normalizedEnd,
    };
  }

  return {
    preset: inferPresetFromRange(normalizedStart, normalizedEnd),
    start: normalizedStart,
    end: normalizedEnd,
  };
};

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

exports.updateAnalyticsDateRangePreference = async (req, res) => {
  try {
    const normalized = normalizeAnalyticsDateRangePreference(req.body);

    if (!normalized) {
      return res.status(400).json({
        message:
          "Invalid analytics date range. Provide a valid preset or both start and end dates.",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.preferences = user.preferences || {};
    user.preferences.analyticsDateRange = normalized;
    await user.save();

    const safeUser = await User.findById(req.userId).select("-password");
    return res.json({
      message: "Analytics date range updated successfully",
      analyticsDateRange: safeUser?.preferences?.analyticsDateRange || normalized,
      user: safeUser,
    });
  } catch (err) {
    console.error("Update analytics date range preference error:", err);
    return res.status(500).json({ message: "Failed to update analytics date range" });
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
