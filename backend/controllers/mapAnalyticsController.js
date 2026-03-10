const {
  parseMapAnalyticsQuery,
  aggregateMapAnalytics,
} = require("../Services/mapAnalyticsService");

function validationError(res, message) {
  return res.status(400).json({ message });
}

function serverError(res, message, error) {
  console.error(message, error);
  return res.status(500).json({ message });
}

exports.getMapAnalytics = async (req, res) => {
  try {
    const parsed = parseMapAnalyticsQuery(req.query);
    if (parsed.error) return validationError(res, parsed.error);

    const rows = await aggregateMapAnalytics(parsed.value);
    return res.json(rows);
  } catch (error) {
    return serverError(res, "Failed to fetch map analytics", error);
  }
};
