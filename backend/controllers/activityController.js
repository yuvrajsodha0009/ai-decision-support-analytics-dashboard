const Activity = require("../models/Activity");

exports.getAllActivities = async (req, res) => {
  try {
    const { status, q, limit } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { action: regex },
        { details: regex },
        { resource: regex },
        { user: regex },
      ];
    }

    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 1000)
      : 200;

    const activities = await Activity.find(filter)
      .sort({ timestamp: -1 })
      .limit(safeLimit)
      .populate("userId", "name email role avatar");

    const shaped = activities.map((a) => {
      const userDoc = a.userId;
      const avatar = userDoc?.avatar || "";
      return {
        _id: a._id,
        user: a.user,
        userRole: a.userRole,
        action: a.action,
        resource: a.resource,
        details: a.details,
        status: a.status,
        timestamp: a.timestamp,
        userId: userDoc?._id,
        avatar,
        ip: a.ip,
        userAgent: a.userAgent,
      };
    });

    res.json(shaped);
  } catch (error) {
    console.error("Fetch activities error:", error);
    res.status(500).json({ message: "Failed to fetch activities" });
  }
};

exports.clearAllActivities = async (_req, res) => {
  try {
    await Activity.deleteMany({});
    res.json({ message: "Activity logs cleared" });
  } catch (error) {
    console.error("Clear activities error:", error);
    res.status(500).json({ message: "Failed to clear activities" });
  }
};
