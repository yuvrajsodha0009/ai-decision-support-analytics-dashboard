const Activity = require("../models/Activity");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const logActivity = async (
  user = "System",
  action,
  resource = "",
  details = "",
  status = "success",
  req
) => {
  try {
    const isPlaceholderUser = (val) => {
      if (!val) return true;
      const normalized = String(val).trim().toLowerCase();
      return normalized === "user" || normalized === "system" || normalized === "unknown";
    };

    const forwardedFor = req?.headers?.["x-forwarded-for"];
    const ip =
      (Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor?.split(",")[0])?.trim() ||
      req?.ip ||
      req?.connection?.remoteAddress ||
      "";

    const userAgent = req?.headers?.["user-agent"] || "";
    let resolvedUserId = req?.userId;
    let resolvedUserRole = "";

    if (!resolvedUserId) {
      const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          resolvedUserId = decoded?.id;
        } catch (error) {
          // Ignore invalid token for logging purposes
        }
      }
    }

    let resolvedUser = user || "System";
    if (resolvedUserId) {
      try {
        const dbUser = await User.findById(resolvedUserId).select(
          "name email role"
        );
        if (dbUser) {
          resolvedUserRole = dbUser.role || "";
          if (isPlaceholderUser(user)) {
            resolvedUser = dbUser.name || dbUser.email || resolvedUser;
          }
        }
      } catch (error) {
        // Ignore user lookup errors for logging purposes
      }
    }

    await Activity.create({
      user: resolvedUser,
      userRole: resolvedUserRole,
      action,
      resource,
      details,
      status,
      userId: resolvedUserId,
      ip,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

module.exports = logActivity;
