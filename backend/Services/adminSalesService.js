const RawSale = require("../models/RawSale");
const {
  parseAnalyticsQuery,
  buildBaseMatch,
} = require("./analyticsService");

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const DEFAULT_PAGE = 1;

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

function parsePositiveInt(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseAdminSalesQuery(rawQuery) {
  const parsed = parseAnalyticsQuery(rawQuery);
  if (parsed.error) return parsed;

  const page = parsePositiveInt(rawQuery.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInt(rawQuery.limit, DEFAULT_LIMIT), MAX_LIMIT);

  return {
    value: {
      ...parsed.value,
      page,
      limit,
    },
  };
}

function rawSalesProjection() {
  return {
    _id: 1,
    transactionId: 1,
    timestamp: 1,
    region: "$geography.region",
    country: "$geography.country",
    category: "$product.category",
    subcategory: "$product.subcategory",
    device: "$marketing.deviceType",
    quantity: { $ifNull: [numericExpr("$quantity"), 0] },
    price: { $ifNull: [numericExpr("$price"), 0] },
    pricingTotal: { $ifNull: [numericExpr("$pricing.total"), null] },
    revenue: { $round: [revenueExpr, 2] },
    orderStatus: 1,
  };
}

async function getPaginatedRawSales(normalizedQuery) {
  const match = buildBaseMatch(normalizedQuery);
  const skip = (normalizedQuery.page - 1) * normalizedQuery.limit;

  const [rows, total] = await Promise.all([
    RawSale.aggregate([
      { $match: match },
      { $sort: { timestamp: -1 } },
      { $skip: skip },
      { $limit: normalizedQuery.limit },
      { $project: rawSalesProjection() },
    ]),
    RawSale.countDocuments(match),
  ]);

  return {
    rows,
    pagination: {
      page: normalizedQuery.page,
      limit: normalizedQuery.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / normalizedQuery.limit)),
    },
  };
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function toCsv(rows) {
  const headers = [
    "transactionId",
    "timestamp",
    "region",
    "country",
    "category",
    "subcategory",
    "device",
    "quantity",
    "price",
    "pricingTotal",
    "revenue",
    "orderStatus",
  ];

  const body = rows.map((row) =>
    headers.map((header) => csvEscape(row[header])).join(",")
  );

  return [headers.join(","), ...body].join("\n");
}

async function exportRawSalesCsv(normalizedQuery) {
  const match = buildBaseMatch(normalizedQuery);

  const rows = await RawSale.aggregate([
    { $match: match },
    { $sort: { timestamp: -1 } },
    { $project: rawSalesProjection() },
  ]);

  return toCsv(rows);
}

module.exports = {
  parseAdminSalesQuery,
  getPaginatedRawSales,
  exportRawSalesCsv,
};

