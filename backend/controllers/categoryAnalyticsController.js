const RawSale = require("../models/RawSale");
const {
  parseAnalyticsQuery,
  buildBaseMatch,
} = require("../Services/analyticsService");

const BREAKDOWN_FIELD_MAP = {
  subcategory: "product.subcategory",
  region: "geography.region",
  device: "marketing.deviceType",
};
const ALLOWED_METRICS = new Set(["revenue", "orders", "aov", "revenueShare"]);
const ALLOWED_CHART_TYPES = new Set(["line", "bar"]);

function validationError(res, message) {
  return res.status(400).json({ message });
}

function serverError(res, message, error) {
  console.error(message, error);
  return res.status(500).json({ message });
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

const round2 = (value) => Number(Number(value || 0).toFixed(2));

function normalizeQuery(rawQuery) {
  return {
    ...rawQuery,
    start: rawQuery.start || rawQuery.startDate,
    end: rawQuery.end || rawQuery.endDate,
  };
}

function decodeCategoryName(rawValue) {
  if (typeof rawValue !== "string") return "";
  try {
    return decodeURIComponent(rawValue).trim();
  } catch (_) {
    return rawValue.trim();
  }
}

function resolveBreakdown(rawBreakdown) {
  if (rawBreakdown === undefined || rawBreakdown === null || rawBreakdown === "") {
    return { value: { key: "subcategory", field: BREAKDOWN_FIELD_MAP.subcategory } };
  }

  const key = String(rawBreakdown).trim().toLowerCase();
  const field = BREAKDOWN_FIELD_MAP[key];
  if (!field) {
    return {
      error: "breakdown must be one of: subcategory, region, device",
    };
  }

  return { value: { key, field } };
}

function resolveMetric(rawMetric) {
  if (rawMetric === undefined || rawMetric === null || rawMetric === "") {
    return { value: "revenue" };
  }

  const metric = String(rawMetric).trim();
  if (!ALLOWED_METRICS.has(metric)) {
    return {
      error: "metric must be one of: revenue, orders, aov, revenueShare",
    };
  }

  return { value: metric };
}

function resolveChartType(rawChartType) {
  if (rawChartType === undefined || rawChartType === null || rawChartType === "") {
    return { value: "line" };
  }

  const chartType = String(rawChartType).trim().toLowerCase();
  if (!ALLOWED_CHART_TYPES.has(chartType)) {
    return {
      error: "chartType must be one of: line, bar",
    };
  }

  return { value: chartType };
}

function chartDateKey(period, groupBy) {
  const parsed = period instanceof Date ? period : new Date(period);
  if (Number.isNaN(parsed.getTime())) return "";

  if (groupBy === "hour") {
    return `${parsed.toISOString().slice(0, 13)}:00`;
  }

  return parsed.toISOString().slice(0, 10);
}

function getMetricAccumulator(metric) {
  if (metric === "orders") return { $sum: 1 };
  if (metric === "aov") return { $avg: revenueExpr };
  return { $sum: revenueExpr };
}

function toMetricValue(metric, value) {
  if (metric === "orders") return Math.round(Number(value || 0));
  return round2(value);
}

function buildSummaryPipeline(match, breakdownField) {
  return [
    { $match: match },
    {
      $group: {
        _id: { $ifNull: [`$${breakdownField}`, "Unknown"] },
        revenue: { $sum: revenueExpr },
        orders: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        breakdown: "$_id",
        revenue: { $ifNull: ["$revenue", 0] },
        orders: { $ifNull: ["$orders", 0] },
      },
    },
    { $sort: { revenue: -1 } },
  ];
}

function buildLineMetricPipeline(match, periodExpr, breakdownField, metric) {
  return [
    { $match: match },
    {
      $group: {
        _id: {
          period: periodExpr,
          breakdown: { $ifNull: [`$${breakdownField}`, "Unknown"] },
        },
        metricValue: getMetricAccumulator(metric),
      },
    },
    {
      $project: {
        _id: 0,
        period: "$_id.period",
        breakdown: "$_id.breakdown",
        value: "$metricValue",
      },
    },
    { $sort: { period: 1 } },
  ];
}

function buildRevenueShareLinePipeline(match, periodExpr, breakdownField) {
  return [
    { $match: match },
    {
      $group: {
        _id: {
          period: periodExpr,
          breakdown: { $ifNull: [`$${breakdownField}`, "Unknown"] },
        },
        revenue: { $sum: revenueExpr },
      },
    },
    {
      $project: {
        _id: 0,
        period: "$_id.period",
        breakdown: "$_id.breakdown",
        revenue: { $ifNull: ["$revenue", 0] },
      },
    },
    { $sort: { period: 1 } },
  ];
}

function buildBarMetricPipeline(match, breakdownField, metric) {
  return [
    { $match: match },
    {
      $group: {
        _id: { $ifNull: [`$${breakdownField}`, "Unknown"] },
        metricValue: getMetricAccumulator(metric),
      },
    },
    {
      $project: {
        _id: 0,
        breakdown: "$_id",
        value: "$metricValue",
      },
    },
  ];
}

function toTableData(summaryRows) {
  const totalRevenue = summaryRows.reduce(
    (sum, row) => sum + Number(row.revenue || 0),
    0
  );

  const tableData = summaryRows
    .map((row) => {
      const breakdownValue = row.breakdown || "Unknown";
      const revenue = round2(row.revenue);
      const orders = Number(row.orders || 0);
      const aov = orders > 0 ? round2(revenue / orders) : 0;
      const revenueShare = totalRevenue > 0 ? round2((revenue / totalRevenue) * 100) : 0;
      return {
        subcategory: breakdownValue,
        revenue,
        orders,
        aov,
        revenueShare,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    tableData,
    subcategories: tableData.map((row) => row.subcategory),
    totalRevenue: round2(totalRevenue),
  };
}

function buildLineChartData(chartRows, subcategories, groupBy, metric) {
  const chartMap = new Map();

  if (metric === "revenueShare") {
    const periodTotals = new Map();
    chartRows.forEach((row) => {
      const date = chartDateKey(row.period, groupBy);
      if (!date) return;
      periodTotals.set(date, (periodTotals.get(date) || 0) + Number(row.revenue || 0));
    });

    chartRows.forEach((row) => {
      const date = chartDateKey(row.period, groupBy);
      if (!date) return;

      const breakdownValue = row.breakdown || "Unknown";
      const periodTotal = periodTotals.get(date) || 0;
      const shareValue = periodTotal > 0 ? round2((Number(row.revenue || 0) / periodTotal) * 100) : 0;

      if (!chartMap.has(date)) {
        chartMap.set(date, { date });
      }
      chartMap.get(date)[breakdownValue] = shareValue;
    });
  } else {
    chartRows.forEach((row) => {
      const date = chartDateKey(row.period, groupBy);
      if (!date) return;

      const breakdownValue = row.breakdown || "Unknown";
      if (!chartMap.has(date)) {
        chartMap.set(date, { date });
      }
      chartMap.get(date)[breakdownValue] = toMetricValue(metric, row.value);
    });
  }

  return Array.from(chartMap.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((row) => {
      const normalizedRow = { ...row };
      subcategories.forEach((subcategory) => {
        if (normalizedRow[subcategory] === undefined) {
          normalizedRow[subcategory] = 0;
        }
      });
      return normalizedRow;
    });
}

function buildBarChartData(metricRows, metric) {
  return metricRows
    .map((row) => ({
      name: row.breakdown || "Unknown",
      value: toMetricValue(metric, row.value),
    }))
    .sort((a, b) => b.value - a.value);
}

function buildBarRevenueShareChartData(tableData) {
  return tableData
    .map((row) => ({
      name: row.subcategory,
      value: round2(row.revenueShare),
    }))
    .sort((a, b) => b.value - a.value);
}

exports.getCategoryAnalytics = async (req, res) => {
  try {
    const categoryName = decodeCategoryName(req.params.categoryName);
    if (!categoryName) return validationError(res, "categoryName is required");

    const breakdownResult = resolveBreakdown(req.query.breakdown);
    if (breakdownResult.error) return validationError(res, breakdownResult.error);
    const metricResult = resolveMetric(req.query.metric);
    if (metricResult.error) return validationError(res, metricResult.error);
    const chartTypeResult = resolveChartType(req.query.chartType);
    if (chartTypeResult.error) return validationError(res, chartTypeResult.error);

    const parsed = parseAnalyticsQuery(normalizeQuery(req.query));
    if (parsed.error) return validationError(res, parsed.error);

    const normalizedQuery = parsed.value;
    const breakdownField = breakdownResult.value.field;
    const metric = metricResult.value;
    const chartType = chartTypeResult.value;

    const match = buildBaseMatch(normalizedQuery);
    match["product.category"] = categoryName;

    const periodExpr = {
      $dateTrunc: {
        date: "$timestamp",
        unit: normalizedQuery.groupBy,
        timezone: normalizedQuery.timezone || "UTC",
      },
    };

    const summaryRows = await RawSale.aggregate(
      buildSummaryPipeline(match, breakdownField)
    );
    const { tableData, subcategories } = toTableData(summaryRows);

    let chartData = [];
    if (chartType === "line") {
      const linePipeline =
        metric === "revenueShare"
          ? buildRevenueShareLinePipeline(match, periodExpr, breakdownField)
          : buildLineMetricPipeline(match, periodExpr, breakdownField, metric);

      const chartRows = await RawSale.aggregate(linePipeline);
      chartData = buildLineChartData(
        chartRows,
        subcategories,
        normalizedQuery.groupBy,
        metric
      );
    } else if (metric === "revenueShare") {
      chartData = buildBarRevenueShareChartData(tableData);
    } else {
      const barRows = await RawSale.aggregate(
        buildBarMetricPipeline(match, breakdownField, metric)
      );
      chartData = buildBarChartData(barRows, metric);
    }

    return res.json({
      chartData,
      tableData,
      subcategories,
    });
  } catch (error) {
    return serverError(res, "Failed to fetch category analytics", error);
  }
};
