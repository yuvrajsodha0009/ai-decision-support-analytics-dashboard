const Activity = require("../models/Activity");
const User = require("../models/User");

const emailRegex = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/;

const extractEmail = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  const direct = text.match(emailRegex)?.[1] || "";
  return direct.toLowerCase();
};

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

    const missingLinkCandidates = activities.filter((a) => !a.userId);
    const candidateEmails = new Set();
    const candidateNames = new Set();

    for (const activity of missingLinkCandidates) {
      const userEmail = extractEmail(activity.user);
      const detailsEmail = extractEmail(activity.details);
      if (userEmail) candidateEmails.add(userEmail);
      if (detailsEmail) candidateEmails.add(detailsEmail);

      const name = String(activity.user || "").trim();
      if (name && !userEmail) candidateNames.add(name);
    }

    let usersByEmail = new Map();
    let usersByName = new Map();

    if (candidateEmails.size || candidateNames.size) {
      const emailList = Array.from(candidateEmails);
      const nameList = Array.from(candidateNames);
      const userLookupFilter = {
        $or: [
          ...(emailList.length ? [{ email: { $in: emailList } }] : []),
          ...(nameList.length ? [{ name: { $in: nameList } }] : []),
        ],
      };

      if (userLookupFilter.$or.length) {
        const matchedUsers = await User.find(userLookupFilter).select(
          "_id name email role avatar",
        );

        usersByEmail = new Map(
          matchedUsers
            .filter((u) => u?.email)
            .map((u) => [String(u.email).trim().toLowerCase(), u]),
        );
        usersByName = new Map(
          matchedUsers
            .filter((u) => u?.name)
            .map((u) => [String(u.name).trim(), u]),
        );
      }
    }

    const shaped = activities.map((a) => {
      const userDocFromRef = a.userId;
      const emailFromUserField = extractEmail(a.user);
      const emailFromDetails = extractEmail(a.details);
      const matchedUser =
        userDocFromRef ||
        usersByEmail.get(emailFromUserField) ||
        usersByEmail.get(emailFromDetails) ||
        usersByName.get(String(a.user || "").trim()) ||
        null;

      const userDoc = matchedUser;
      const avatar = userDoc?.avatar || "";
      return {
        _id: a._id,
        user: a.user,
        userRole: a.userRole || userDoc?.role || "",
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
