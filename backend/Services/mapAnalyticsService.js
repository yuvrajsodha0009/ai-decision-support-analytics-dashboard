const RawSale = require("../models/RawSale");

const ALLOWED_LEVELS = new Set(["world", "country"]);
const ALLOWED_METRICS = new Set(["revenue", "orders", "aov"]);
const MAX_FILTER_LENGTH = 120;

const FILTER_FIELD_MAP = {
  region: "geography.region",
  category: "product.category",
  subcategory: "product.subcategory",
  device: "marketing.deviceType",
};

function parseDate(value, fieldName) {
  if (!value || typeof value !== "string") {
    return { error: `${fieldName} is required and must be an ISO date` };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${fieldName} must be a valid ISO date` };
  }

  return { value: parsed };
}

function parseOptionalString(value, fieldName) {
  if (value === undefined || value === null || value === "") return {};

  if (typeof value !== "string") {
    return { error: `${fieldName} must be a string` };
  }

  const trimmed = value.trim();
  if (!trimmed) return {};
  if (trimmed.length > MAX_FILTER_LENGTH) {
    return { error: `${fieldName} exceeds max length ${MAX_FILTER_LENGTH}` };
  }

  return { value: trimmed };
}

function parseMapAnalyticsQuery(query) {
  const level = typeof query.level === "string" ? query.level.trim().toLowerCase() : "";
  if (!ALLOWED_LEVELS.has(level)) {
    return { error: "level must be one of world or country" };
  }

  const metric = typeof query.metric === "string" ? query.metric.trim().toLowerCase() : "";
  if (!ALLOWED_METRICS.has(metric)) {
    return { error: "metric must be one of revenue, orders, aov" };
  }

  const startResult = parseDate(query.startDate || query.start, "startDate");
  if (startResult.error) return { error: startResult.error };

  const endResult = parseDate(query.endDate || query.end, "endDate");
  if (endResult.error) return { error: endResult.error };

  const startDate = startResult.value;
  const endDate = endResult.value;

  if (startDate >= endDate) {
    return { error: "startDate must be before endDate" };
  }

  const countryResult = parseOptionalString(query.country, "country");
  if (countryResult.error) return { error: countryResult.error };

  if (level === "country" && !countryResult.value) {
    return { error: "country is required when level is country" };
  }

  const filters = {};
  for (const field of Object.keys(FILTER_FIELD_MAP)) {
    const result = parseOptionalString(query[field], field);
    if (result.error) return { error: result.error };
    if (result.value) filters[field] = result.value;
  }

  return {
    value: {
      level,
      metric,
      country: countryResult.value || null,
      startDate,
      endDate,
      filters,
    },
  };
}

function numericExpr(path) {
  return {
    $convert: {
      input: path,
      to: "double",
      onError: null,
      onNull: null,
    },
  };
}

const revenueExpr = {
  $ifNull: [
    numericExpr("$pricing.total"),
    {
      $ifNull: [
        numericExpr("$revenue"),
        {
          $multiply: [
            { $ifNull: [numericExpr("$price"), 0] },
            { $ifNull: [numericExpr("$quantity"), 0] },
          ],
        },
      ],
    },
  ],
};

function buildMatch(query) {
  const match = {
    timestamp: {
      $gte: query.startDate,
      $lte: query.endDate,
    },
    orderStatus: "completed",
  };

  for (const [key, value] of Object.entries(query.filters)) {
    const dbField = FILTER_FIELD_MAP[key];
    if (dbField && value) {
      match[dbField] = value;
    }
  }

  if (query.country) {
    match["geography.country"] = query.country;
  }

  return match;
}

function buildGroupId(level) {
  if (level === "country") {
    return {
      $ifNull: ["$geography.state", { $ifNull: ["$geography.city", "Unknown"] }],
    };
  }

  return { $ifNull: ["$geography.country", "Unknown"] };
}

function buildValueProjection(metric) {
  if (metric === "orders") {
    return "$totalOrders";
  }

  if (metric === "aov") {
    return {
      $round: [
        {
          $cond: [
            { $gt: ["$totalOrders", 0] },
            { $divide: ["$totalRevenue", "$totalOrders"] },
            0,
          ],
        },
        2,
      ],
    };
  }

  return { $round: ["$totalRevenue", 2] };
}

async function aggregateMapAnalytics(query) {
  const pipeline = [
    { $match: buildMatch(query) },
    {
      $group: {
        _id: buildGroupId(query.level),
        totalRevenue: { $sum: revenueExpr },
        totalOrders: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        name: { $ifNull: ["$_id", "Unknown"] },
        value: buildValueProjection(query.metric),
      },
    },
    { $sort: { value: -1, name: 1 } },
  ];

  return RawSale.aggregate(pipeline);
}

module.exports = {
  parseMapAnalyticsQuery,
  aggregateMapAnalytics,
};
