const {
  parseAnalyticsQuery,
  aggregateTimeSeries,
  aggregateSummary,
  aggregateByDimension,
  aggregateFilterOptions,
} = require("../Services/analyticsService");

function validationError(res, message) {
  return res.status(400).json({ message });
}

function serverError(res, message, error) {
  // Keep internal error in logs and return safe message to client.
  console.error(message, error);
  return res.status(500).json({ message });
}

exports.getAnalytics = async (req, res) => {
  try {
    const parsed = parseAnalyticsQuery(req.query);
    if (parsed.error) return validationError(res, parsed.error);

    const rows = await aggregateTimeSeries(parsed.value);
    return res.json(rows);
  } catch (error) {
    return serverError(res, "Failed to fetch analytics", error);
  }
};

exports.getAnalyticsSummary = async (req, res) => {
  try {
    const parsed = parseAnalyticsQuery(req.query);
    if (parsed.error) return validationError(res, parsed.error);

    const summary = await aggregateSummary(parsed.value);
    return res.json(summary);
  } catch (error) {
    return serverError(res, "Failed to fetch analytics summary", error);
  }
};

exports.getAnalyticsByCategory = async (req, res) => {
  try {
    const parsed = parseAnalyticsQuery(req.query);
    if (parsed.error) return validationError(res, parsed.error);

    const rows = await aggregateByDimension(parsed.value, "category");
    return res.json(rows);
  } catch (error) {
    return serverError(res, "Failed to fetch category analytics", error);
  }
};

exports.getAnalyticsByRegion = async (req, res) => {
  try {
    const parsed = parseAnalyticsQuery(req.query);
    if (parsed.error) return validationError(res, parsed.error);

    const rows = await aggregateByDimension(parsed.value, "region");
    return res.json(rows);
  } catch (error) {
    return serverError(res, "Failed to fetch region analytics", error);
  }
};

exports.getAnalyticsByDevice = async (req, res) => {
  try {
    const parsed = parseAnalyticsQuery(req.query);
    if (parsed.error) return validationError(res, parsed.error);

    const rows = await aggregateByDimension(parsed.value, "device");
    return res.json(rows);
  } catch (error) {
    return serverError(res, "Failed to fetch device analytics", error);
  }
};

exports.getAnalyticsFilterOptions = async (req, res) => {
  try {
    const parsed = parseAnalyticsQuery(req.query);
    if (parsed.error) return validationError(res, parsed.error);

    const options = await aggregateFilterOptions(parsed.value);
    return res.json(options);
  } catch (error) {
    return serverError(res, "Failed to fetch analytics filter options", error);
  }
};

