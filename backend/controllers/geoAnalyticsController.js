const {
  parseGeoAnalyticsQuery,
  aggregateGeoSummary,
  aggregateGeoMap,
  aggregateGeoTopRegions,
  aggregateGeoRevenueTrend,
  aggregateGeoCategoryHeatmap,
  aggregateGeoInsights,
  aggregateGeoFilterOptions,
} = require("../Services/geoAnalyticsService");

function validationError(res, message) {
  return res.status(400).json({ message });
}

function serverError(res, message, error) {
  console.error(message, error);
  return res.status(500).json({ message });
}

function parseQuery(req, res, options = {}) {
  const parsed = parseGeoAnalyticsQuery(req.query, options);
  if (parsed.error) {
    validationError(res, parsed.error);
    return null;
  }
  return parsed.value;
}

exports.getGeoSummary = async (req, res) => {
  try {
    const query = parseQuery(req, res);
    if (!query) return null;
    const summary = await aggregateGeoSummary(query);
    return res.json(summary);
  } catch (error) {
    return serverError(res, "Failed to fetch geo analytics summary", error);
  }
};

exports.getGeoMap = async (req, res) => {
  try {
    const query = parseQuery(req, res, { strictHierarchy: false });
    if (!query) return null;
    const rows = await aggregateGeoMap(query);
    return res.json(rows);
  } catch (error) {
    return serverError(res, "Failed to fetch geo map analytics", error);
  }
};

exports.getGeoTopRegions = async (req, res) => {
  try {
    const query = parseQuery(req, res, { strictHierarchy: false });
    if (!query) return null;
    const rows = await aggregateGeoTopRegions(query);
    return res.json(rows);
  } catch (error) {
    return serverError(res, "Failed to fetch top geo regions", error);
  }
};

exports.getGeoRevenueTrend = async (req, res) => {
  try {
    const query = parseQuery(req, res, { strictHierarchy: false });
    if (!query) return null;
    const rows = await aggregateGeoRevenueTrend(query);
    return res.json(rows);
  } catch (error) {
    return serverError(res, "Failed to fetch geo revenue trend", error);
  }
};

exports.getGeoRegionBar = async (req, res) => {
  try {
    const query = parseQuery(req, res, { strictHierarchy: false });
    if (!query) return null;
    const rows = await aggregateGeoTopRegions({
      ...query,
      limit: query.limit || 8,
    });
    return res.json(rows);
  } catch (error) {
    return serverError(res, "Failed to fetch geo region bar data", error);
  }
};

exports.getGeoCategoryHeatmap = async (req, res) => {
  try {
    const query = parseQuery(req, res, { strictHierarchy: false });
    if (!query) return null;
    const heatmap = await aggregateGeoCategoryHeatmap(query);
    return res.json(heatmap);
  } catch (error) {
    return serverError(res, "Failed to fetch geo category heatmap", error);
  }
};

exports.getGeoInsights = async (req, res) => {
  try {
    const query = parseQuery(req, res, { strictHierarchy: false });
    if (!query) return null;
    const insights = await aggregateGeoInsights(query);
    return res.json(insights);
  } catch (error) {
    return serverError(res, "Failed to fetch geo insights", error);
  }
};

exports.getGeoFilterOptions = async (req, res) => {
  try {
    const query = parseQuery(req, res, { strictHierarchy: false });
    if (!query) return null;
    const options = await aggregateGeoFilterOptions(query);
    return res.json(options);
  } catch (error) {
    return serverError(res, "Failed to fetch geo filter options", error);
  }
};
