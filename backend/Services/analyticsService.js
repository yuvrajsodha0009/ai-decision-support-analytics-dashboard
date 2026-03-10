const RawSale = require("../models/RawSale");
const {
  validateAndNormalizeAnalyticsQuery,
} = require("../utils/analyticsValidation");

const FILTER_FIELD_MAP = {
  region: "geography.region",
  country: "geography.country",
  category: "product.category",
  subcategory: "product.subcategory",
  device: "marketing.deviceType",
};

const CATEGORY_CONVERSION_RATE_MAP = {
  Electronics: 0.025,
  Fashion: 0.035,
  Grocery: 0.04,
};

const DEFAULT_SIMULATED_CONVERSION_RATE = 0.03;

const FUNNEL_PROFILE = {
  visitorToAddToCart: 0.4,
  addToCartToCheckout: 0.65,
  checkoutToPurchase: 0.75,
};

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

const quantityExpr = { $ifNull: [numericExpr("$quantity"), 0] };

function buildBaseMatch(normalizedQuery) {
  const match = {
    timestamp: {
      $gte: normalizedQuery.start,
      $lte: normalizedQuery.end,
    },
    orderStatus: "completed",
  };

  for (const [key, value] of Object.entries(normalizedQuery.filters)) {
    const dbField = FILTER_FIELD_MAP[key];
    if (!dbField) continue;
    match[dbField] = value;
  }

  return match;
}

function groupDateExpr(groupBy, timezone) {
  return {
    $dateTrunc: {
      date: "$timestamp",
      unit: groupBy,
      timezone: timezone || "UTC",
    },
  };
}

function safeGrowth(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function rounded(value) {
  return Number(Number(value || 0).toFixed(2));
}

function getCategoryConversionRate(category) {
  return CATEGORY_CONVERSION_RATE_MAP[category] || DEFAULT_SIMULATED_CONVERSION_RATE;
}

function calculateWeightedConversionRate(categoryRows, totalOrders) {
  if (!totalOrders) return DEFAULT_SIMULATED_CONVERSION_RATE;

  const weightedRate = categoryRows.reduce((sum, row) => {
    const orders = Number(row.totalOrders || 0);
    if (!orders) return sum;
    return sum + orders * getCategoryConversionRate(row.category);
  }, 0);

  const rate = weightedRate ? weightedRate / totalOrders : DEFAULT_SIMULATED_CONVERSION_RATE;

  // Guardrail to keep simulated conversion in realistic ecommerce bounds.
  return Math.min(0.05, Math.max(0.02, rate));
}

function deriveFunnelCounts(totalOrders, visitorCount) {
  if (!totalOrders || !visitorCount) {
    return {
      visitorCount: 0,
      addToCartCount: 0,
      checkoutCount: 0,
      purchaseCount: 0,
    };
  }

  // Start from the baseline funnel profile, then scale deterministically so purchase = orders.
  const baselineAddToCart = visitorCount * FUNNEL_PROFILE.visitorToAddToCart;
  const baselineCheckout =
    baselineAddToCart * FUNNEL_PROFILE.addToCartToCheckout;
  const baselinePurchase =
    baselineCheckout * FUNNEL_PROFILE.checkoutToPurchase;

  const scale = baselinePurchase > 0 ? totalOrders / baselinePurchase : 1;

  let addToCartCount = Math.max(
    totalOrders,
    Math.round(baselineAddToCart * scale)
  );
  const checkoutCount = Math.max(
    totalOrders,
    Math.round(baselineCheckout * scale)
  );

  if (addToCartCount < checkoutCount) {
    addToCartCount = checkoutCount;
  }

  return {
    visitorCount: Math.max(visitorCount, addToCartCount),
    addToCartCount,
    checkoutCount,
    purchaseCount: totalOrders,
  };
}

async function aggregateTimeSeries(normalizedQuery) {
  const match = buildBaseMatch(normalizedQuery);
  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: groupDateExpr(normalizedQuery.groupBy, normalizedQuery.timezone),
        totalRevenue: { $sum: revenueExpr },
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: quantityExpr },
      },
    },
    {
      $project: {
        _id: 0,
        period: "$_id",
        totalRevenue: { $round: ["$totalRevenue", 2] },
        totalOrders: 1,
        totalQuantity: { $round: ["$totalQuantity", 2] },
      },
    },
    { $sort: { period: 1 } },
  ];

  return RawSale.aggregate(pipeline);
}

async function aggregateSummaryWindow(match) {
  const [totalsResult, categoryMixResult] = await Promise.all([
    RawSale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: revenueExpr },
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: quantityExpr },
          returningOrders: {
            $sum: {
              $cond: [{ $eq: ["$customer.customerType", "returning"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          totalOrders: 1,
          totalQuantity: { $round: ["$totalQuantity", 2] },
          returningOrders: 1,
        },
      },
    ]),
    RawSale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$product.category", "Other"] },
          totalOrders: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalOrders: 1,
        },
      },
    ]),
  ]);

  const totals = totalsResult[0] || {
    totalRevenue: 0,
    totalOrders: 0,
    totalQuantity: 0,
    returningOrders: 0,
  };

  const totalRevenue = rounded(totals.totalRevenue);
  const totalOrders = Number(totals.totalOrders || 0);
  const totalQuantity = rounded(totals.totalQuantity);
  const returningOrders = Number(totals.returningOrders || 0);

  const simulatedConversionRate = calculateWeightedConversionRate(
    categoryMixResult || [],
    totalOrders
  );

  // Visitors are simulated from realistic conversion baselines by category mix.
  const simulatedVisitors = totalOrders
    ? Math.round(totalOrders / simulatedConversionRate)
    : 0;
  const visitorCount = Math.max(totalOrders, simulatedVisitors);

  const funnel = deriveFunnelCounts(totalOrders, visitorCount);

  const conversionRatePercentage = funnel.visitorCount
    ? (funnel.purchaseCount / funnel.visitorCount) * 100
    : 0;

  const returningCustomersPercentage = totalOrders
    ? (returningOrders / totalOrders) * 100
    : 0;

  return {
    totalRevenue,
    totalOrders,
    totalQuantity,
    visitorCount: funnel.visitorCount,
    addToCartCount: funnel.addToCartCount,
    checkoutCount: funnel.checkoutCount,
    purchaseCount: funnel.purchaseCount,
    conversionRatePercentage: rounded(conversionRatePercentage),
    returningOrders,
    returningCustomersPercentage: rounded(returningCustomersPercentage),
  };
}

async function aggregateSummary(normalizedQuery) {
  const currentMatch = buildBaseMatch(normalizedQuery);
  const current = await aggregateSummaryWindow(currentMatch);

  if (!normalizedQuery.compareMode) {
    return {
      ...current,
      revenueGrowthPercentage: null,
      orderGrowthPercentage: null,
      conversionGrowthPercentage: null,
      returningCustomersGrowthPercentage: null,
    };
  }

  const rangeMs = normalizedQuery.end.getTime() - normalizedQuery.start.getTime();
  const prevEnd = new Date(normalizedQuery.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - rangeMs);

  const previousMatch = {
    ...currentMatch,
    timestamp: {
      $gte: prevStart,
      $lte: prevEnd,
    },
  };

  const previous = await aggregateSummaryWindow(previousMatch);

  return {
    ...current,
    revenueGrowthPercentage: rounded(
      safeGrowth(current.totalRevenue, previous.totalRevenue)
    ),
    orderGrowthPercentage: rounded(
      safeGrowth(current.totalOrders, previous.totalOrders)
    ),
    conversionGrowthPercentage: rounded(
      safeGrowth(
        current.conversionRatePercentage,
        previous.conversionRatePercentage
      )
    ),
    returningCustomersGrowthPercentage: rounded(
      safeGrowth(
        current.returningCustomersPercentage,
        previous.returningCustomersPercentage
      )
    ),
  };
}

async function aggregateByDimension(normalizedQuery, dimension) {
  const fieldName = FILTER_FIELD_MAP[dimension] || null;
  if (!fieldName) {
    throw new Error(`Unsupported dimension: ${dimension}`);
  }

  const alias = dimension;
  const match = buildBaseMatch(normalizedQuery);

  return RawSale.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $ifNull: [`$${fieldName}`, "Unknown"] },
        totalRevenue: { $sum: revenueExpr },
        totalOrders: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        [alias]: "$_id",
        totalRevenue: { $round: ["$totalRevenue", 2] },
        totalOrders: 1,
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);
}

function compactDistinctValues(rows) {
  return rows
    .map((item) => item._id)
    .filter((value) => value !== null && value !== undefined && value !== "");
}

async function aggregateFilterOptions(normalizedQuery) {
  const match = buildBaseMatch(normalizedQuery);

  const result = await RawSale.aggregate([
    { $match: match },
    {
      $facet: {
        regions: [{ $group: { _id: "$geography.region" } }, { $sort: { _id: 1 } }],
        countries: [
          { $group: { _id: "$geography.country" } },
          { $sort: { _id: 1 } },
        ],
        categories: [
          { $group: { _id: "$product.category" } },
          { $sort: { _id: 1 } },
        ],
        subcategories: [
          { $group: { _id: "$product.subcategory" } },
          { $sort: { _id: 1 } },
        ],
        devices: [
          { $group: { _id: "$marketing.deviceType" } },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const data = result[0] || {};
  return {
    regions: compactDistinctValues(data.regions || []),
    countries: compactDistinctValues(data.countries || []),
    categories: compactDistinctValues(data.categories || []),
    subcategories: compactDistinctValues(data.subcategories || []),
    devices: compactDistinctValues(data.devices || []),
  };
}

function parseAnalyticsQuery(rawQuery) {
  return validateAndNormalizeAnalyticsQuery(rawQuery);
}

module.exports = {
  parseAnalyticsQuery,
  buildBaseMatch,
  aggregateTimeSeries,
  aggregateSummaryWindow,
  aggregateSummary,
  aggregateByDimension,
  aggregateFilterOptions,
};
