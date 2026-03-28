const RawSale = require("../models/RawSale");
const { Country, State, City } = require("country-state-city");

const ALLOWED_LEVELS = new Set(["world", "country", "state", "city"]);
const ALLOWED_METRICS = new Set(["revenue", "orders", "aov", "customers"]);
const ALLOWED_GROUP_BY = new Set(["hour", "day", "week", "month"]);
const CHANNEL_LABELS = {
  online: "Online",
  store: "Store",
  partner: "Partner",
};
const MAX_FILTER_LENGTH = 120;
const MAX_LIMIT = 200;

const COUNTRY_NAME_ALIASES = {
  "united states of america": "united states",
  "russian federation": "russia",
  "republic of korea": "south korea",
  "korea, republic of": "south korea",
  "democratic people's republic of korea": "north korea",
  czechia: "czech republic",
  "viet nam": "vietnam",
  "lao pdr": "laos",
  "syrian arab republic": "syria",
  "iran (islamic republic of)": "iran",
  "moldova (republic of)": "moldova",
  "tã¼rkiye": "turkey",
  "tãƒâ¼rkiye": "turkey",
};

const normalizeGeoName = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const COUNTRY_ISO_BY_NAME = (() => {
  const map = new Map();

  Country.getAllCountries().forEach((country) => {
    const normalized = normalizeGeoName(country?.name);
    if (normalized) {
      map.set(normalized, country.isoCode);
    }
  });

  Object.entries(COUNTRY_NAME_ALIASES).forEach(([source, target]) => {
    const sourceKey = normalizeGeoName(source);
    const targetKey = normalizeGeoName(target);
    const isoCode = map.get(targetKey);
    if (sourceKey && isoCode) {
      map.set(sourceKey, isoCode);
    }
  });

  return map;
})();

const COUNTRY_CANONICAL_NAME_BY_NORMALIZED = (() => {
  const map = new Map();

  Country.getAllCountries().forEach((country) => {
    const canonical = String(country?.name || "").trim();
    const normalized = normalizeGeoName(canonical);
    if (normalized && canonical) {
      map.set(normalized, canonical);
    }
  });

  Object.entries(COUNTRY_NAME_ALIASES).forEach(([source, target]) => {
    const sourceKey = normalizeGeoName(source);
    const targetKey = normalizeGeoName(target);
    const canonicalTarget = map.get(targetKey) || target;
    if (sourceKey && canonicalTarget) {
      map.set(sourceKey, canonicalTarget);
    }
  });

  return map;
})();

const COUNTRY_STATE_CITY_CACHE = new Map();

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

const channelLabelExpr = {
  $let: {
    vars: {
      source: {
        $toLower: { $ifNull: ["$marketing.trafficSource", ""] },
      },
    },
    in: {
      $switch: {
        branches: [
          {
            case: {
              $regexMatch: {
                input: "$$source",
                regex: /(store|retail|offline|pos)/,
              },
            },
            then: "Store",
          },
          {
            case: {
              $regexMatch: {
                input: "$$source",
                regex: /(partner|affiliate|reseller|b2b)/,
              },
            },
            then: "Partner",
          },
        ],
        default: "Online",
      },
    },
  },
};

const segmentLabelExpr = {
  $cond: [{ $eq: ["$customer.customerType", "returning"] }, "Loyal", "Prospect"],
};

const customerIdExpr = {
  $ifNull: ["$customer.customerId", "$transactionId"],
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
  if (value === undefined || value === null || value === "") {
    return {};
  }

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

function parseOptionalLimit(value) {
  if (value === undefined || value === null || value === "") {
    return { value: 10 };
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: "limit must be a positive integer" };
  }

  return {
    value: Math.min(parsed, MAX_LIMIT),
  };
}

function parseTimezone(value) {
  if (!value || typeof value !== "string") {
    return { value: "UTC" };
  }

  const trimmed = value.trim();
  if (!trimmed) return { value: "UTC" };

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return { value: trimmed };
  } catch (_) {
    return { error: "timezone must be a valid IANA timezone string" };
  }
}

function toChannelLabel(channelRaw) {
  if (!channelRaw) return "";
  const normalized = String(channelRaw).trim().toLowerCase();
  return CHANNEL_LABELS[normalized] || "";
}

function toCustomerTypeFromSegment(segmentRaw) {
  if (!segmentRaw) return "";
  const normalized = String(segmentRaw).trim().toLowerCase();
  if (["new", "prospect"].includes(normalized)) return "new";
  if (["returning", "loyal"].includes(normalized)) return "returning";
  return "";
}

function parseGeoAnalyticsQuery(rawQuery, options = {}) {
  const startRaw = rawQuery.startDate || rawQuery.start;
  const endRaw = rawQuery.endDate || rawQuery.end;

  const startResult = parseDate(startRaw, "startDate");
  if (startResult.error) return { error: startResult.error };

  const endResult = parseDate(endRaw, "endDate");
  if (endResult.error) return { error: endResult.error };

  const startDate = startResult.value;
  const endDate = endResult.value;

  if (startDate >= endDate) {
    return { error: "startDate must be before endDate" };
  }

  const levelRaw = typeof rawQuery.level === "string" ? rawQuery.level.trim().toLowerCase() : "";
  const level = levelRaw || "world";
  if (!ALLOWED_LEVELS.has(level)) {
    return { error: "level must be one of world, country, state, city" };
  }

  const metricRaw =
    typeof rawQuery.metric === "string" ? rawQuery.metric.trim().toLowerCase() : "";
  const metric = metricRaw || "revenue";
  if (!ALLOWED_METRICS.has(metric)) {
    return { error: "metric must be one of revenue, orders, aov, customers" };
  }

  const groupByRaw =
    typeof rawQuery.groupBy === "string" ? rawQuery.groupBy.trim().toLowerCase() : "";
  const groupBy = groupByRaw || "day";
  if (!ALLOWED_GROUP_BY.has(groupBy)) {
    return { error: "groupBy must be one of hour, day, week, month" };
  }

  const timezoneResult = parseTimezone(rawQuery.timezone);
  if (timezoneResult.error) return { error: timezoneResult.error };

  const limitResult = parseOptionalLimit(rawQuery.limit);
  if (limitResult.error) return { error: limitResult.error };

  const regionResult = parseOptionalString(rawQuery.region, "region");
  if (regionResult.error) return { error: regionResult.error };

  const countryResult = parseOptionalString(rawQuery.country, "country");
  if (countryResult.error) return { error: countryResult.error };

  const stateResult = parseOptionalString(rawQuery.state, "state");
  if (stateResult.error) return { error: stateResult.error };

  const cityResult = parseOptionalString(rawQuery.city, "city");
  if (cityResult.error) return { error: cityResult.error };

  const categoryResult = parseOptionalString(rawQuery.category, "category");
  if (categoryResult.error) return { error: categoryResult.error };

  const productResult = parseOptionalString(rawQuery.product, "product");
  if (productResult.error) return { error: productResult.error };

  const segmentResult = parseOptionalString(rawQuery.segment, "segment");
  if (segmentResult.error) return { error: segmentResult.error };

  const customerTypeResult = parseOptionalString(
    rawQuery.customerType || rawQuery.customerStatus,
    "customerType"
  );
  if (customerTypeResult.error) return { error: customerTypeResult.error };

  const channelResult = parseOptionalString(rawQuery.channel, "channel");
  if (channelResult.error) return { error: channelResult.error };

  const customerTypeFromSegment = toCustomerTypeFromSegment(segmentResult.value);
  const customerTypeNormalized = customerTypeResult.value
    ? String(customerTypeResult.value).trim().toLowerCase()
    : "";

  if (customerTypeNormalized && !["new", "returning"].includes(customerTypeNormalized)) {
    return { error: "customerType must be one of new or returning" };
  }

  if (
    customerTypeNormalized &&
    customerTypeFromSegment &&
    customerTypeNormalized !== customerTypeFromSegment
  ) {
    return { error: "customerType and segment are conflicting filters" };
  }

  const channelLabel = toChannelLabel(channelResult.value);
  if (channelResult.value && !channelLabel) {
    return { error: "channel must be one of Online, Store, Partner" };
  }

  const strictHierarchy = options.strictHierarchy !== false;
  const country = countryResult.value || "";
  const state = stateResult.value || "";
  const city = cityResult.value || "";

  if (strictHierarchy && level !== "world" && !country) {
    return { error: "country is required for country, state, and city levels" };
  }

  if (strictHierarchy && ["state", "city"].includes(level) && !state) {
    return { error: "state is required for state and city levels" };
  }

  if (strictHierarchy && level === "city" && !city) {
    return { error: "city is required for city level" };
  }

  return {
    value: {
      startDate,
      endDate,
      level,
      metric,
      limit: limitResult.value,
      groupBy,
      timezone: timezoneResult.value,
      region: regionResult.value || "",
      country,
      state,
      city,
      category: categoryResult.value || "",
      product: productResult.value || "",
      segment: segmentResult.value || "",
      customerType: customerTypeNormalized || customerTypeFromSegment || "",
      channel: channelLabel,
    },
  };
}

function buildPreviousRange(startDate, endDate) {
  const rangeMs = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - rangeMs);

  return {
    startDate: previousStart,
    endDate: previousEnd,
  };
}

function locationExprForLevel(level) {
  if (level === "country") {
    return {
      $ifNull: ["$geography.state", { $ifNull: ["$geography.city", "Unknown"] }],
    };
  }

  if (level === "state" || level === "city") {
    return { $ifNull: ["$geography.city", "Unknown"] };
  }

  return { $ifNull: ["$geography.country", "Unknown"] };
}

function buildBaseStages(query, range, options = {}) {
  const match = {
    timestamp: {
      $gte: range.startDate,
      $lte: range.endDate,
    },
    orderStatus: "completed",
  };

  if (query.region) match["geography.region"] = query.region;
  if (query.country) match["geography.country"] = query.country;
  if (query.state) match["geography.state"] = query.state;
  if (query.city) match["geography.city"] = query.city;
  if (query.category) match["product.category"] = query.category;
  if (query.product) match["product.productName"] = query.product;
  if (query.customerType) match["customer.customerType"] = query.customerType;

  const stages = [{ $match: match }];

  const includeDerived = options.includeDerivedFields || Boolean(query.channel);
  if (includeDerived) {
    stages.push({
      $addFields: {
        __channel: channelLabelExpr,
        __segmentLabel: segmentLabelExpr,
      },
    });
  }

  if (query.channel && !options.skipChannelFilter) {
    stages.push({
      $match: {
        __channel: query.channel,
      },
    });
  }

  return stages;
}

function safeGrowth(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function rounded(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function toMetricValue(row, metric) {
  if (!row) return 0;
  if (metric === "orders") return Number(row.orders || 0);
  if (metric === "aov") return Number(row.aov || 0);
  if (metric === "customers") return Number(row.customers || 0);
  return Number(row.revenue || 0);
}

function resolveCountryIso(countryName) {
  const normalized = normalizeGeoName(countryName);
  if (!normalized) return "";
  return COUNTRY_ISO_BY_NAME.get(normalized) || "";
}

function toCanonicalCountryName(countryName) {
  const raw = String(countryName || "").trim();
  if (!raw) return "Unknown";

  const normalized = normalizeGeoName(raw);
  const canonical = COUNTRY_CANONICAL_NAME_BY_NORMALIZED.get(normalized);
  if (canonical) return canonical;

  return raw;
}

function mergeWorldRowsByCountry(rows = []) {
  const merged = new Map();

  rows.forEach((row) => {
    const countryName = toCanonicalCountryName(row?.name);
    const revenue = Number(row?.revenue || 0);
    const orders = Number(row?.orders || 0);
    const customers = Number(row?.customers || 0);

    if (!merged.has(countryName)) {
      merged.set(countryName, {
        name: countryName,
        revenue: 0,
        orders: 0,
        customers: 0,
      });
    }

    const entry = merged.get(countryName);
    entry.revenue += revenue;
    entry.orders += orders;
    entry.customers += customers;
  });

  return [...merged.values()].map((entry) => {
    const aov = entry.orders > 0 ? entry.revenue / entry.orders : 0;
    return {
      name: entry.name,
      revenue: rounded(entry.revenue),
      orders: Number(entry.orders || 0),
      aov: rounded(aov),
      customers: Number(entry.customers || 0),
    };
  });
}

function getCountryStateCityIndex(countryIso) {
  if (!countryIso) return null;
  if (COUNTRY_STATE_CITY_CACHE.has(countryIso)) {
    return COUNTRY_STATE_CITY_CACHE.get(countryIso);
  }

  const states = State.getStatesOfCountry(countryIso) || [];
  const cities = City.getCitiesOfCountry(countryIso) || [];
  const stateNameByIso = new Map();
  const stateNameByNormalized = new Map();
  const cityToStateName = new Map();

  states.forEach((state) => {
    const stateName = String(state?.name || "").trim();
    const stateKey = normalizeGeoName(stateName);
    if (!stateName || !stateKey) return;
    stateNameByNormalized.set(stateKey, stateName);
    if (state?.isoCode) {
      stateNameByIso.set(state.isoCode, stateName);
    }
  });

  cities.forEach((city) => {
    const cityName = String(city?.name || "").trim();
    const cityKey = normalizeGeoName(cityName);
    if (!cityName || !cityKey) return;

    const stateName =
      stateNameByIso.get(city?.stateCode) ||
      String(city?.stateName || "").trim();
    const stateKey = normalizeGeoName(stateName);
    const canonicalStateName = stateNameByNormalized.get(stateKey) || stateName;
    if (!canonicalStateName) return;

    if (!cityToStateName.has(cityKey)) {
      cityToStateName.set(cityKey, canonicalStateName);
    }
  });

  const index = {
    stateNameByNormalized,
    cityToStateName,
  };

  COUNTRY_STATE_CITY_CACHE.set(countryIso, index);
  return index;
}

function rollupRowsToCountryStates(rows, countryName, metric) {
  const countryIso = resolveCountryIso(countryName);
  const index = getCountryStateCityIndex(countryIso);
  if (!index) return [];

  const aggregate = new Map();

  rows.forEach((row) => {
    const sourceName = String(row?.name || "").trim();
    if (!sourceName) return;

    const nameKey = normalizeGeoName(sourceName);
    const canonicalStateName =
      index.stateNameByNormalized.get(nameKey) ||
      index.cityToStateName.get(nameKey) ||
      "";
    if (!canonicalStateName) return;

    const revenue = Number(row?.revenue || 0);
    const orders = Number(row?.orders || 0);
    const customers = Number(row?.customers || 0);
    const metricValue = Number(row?.value || 0);
    const growth = Number(row?.growth || 0);
    const revenueGrowth = Number(row?.revenueGrowth || 0);
    const metricWeight = Math.abs(metricValue);
    const revenueWeight = Math.abs(revenue);

    if (!aggregate.has(canonicalStateName)) {
      aggregate.set(canonicalStateName, {
        name: canonicalStateName,
        revenue: 0,
        orders: 0,
        customers: 0,
        growthWeighted: 0,
        growthWeight: 0,
        revenueGrowthWeighted: 0,
        revenueGrowthWeight: 0,
      });
    }

    const entry = aggregate.get(canonicalStateName);
    entry.revenue += revenue;
    entry.orders += orders;
    entry.customers += customers;
    entry.growthWeighted += growth * metricWeight;
    entry.growthWeight += metricWeight;
    entry.revenueGrowthWeighted += revenueGrowth * revenueWeight;
    entry.revenueGrowthWeight += revenueWeight;
  });

  const rolledRows = [...aggregate.values()].map((entry) => {
    const aov = entry.orders > 0 ? entry.revenue / entry.orders : 0;
    const value =
      metric === "orders"
        ? entry.orders
        : metric === "aov"
          ? aov
          : metric === "customers"
            ? entry.customers
            : entry.revenue;

    return {
      name: entry.name,
      revenue: rounded(entry.revenue),
      orders: Number(entry.orders || 0),
      aov: rounded(aov),
      customers: Number(entry.customers || 0),
      growth:
        entry.growthWeight > 0
          ? rounded(entry.growthWeighted / entry.growthWeight)
          : 0,
      revenueGrowth:
        entry.revenueGrowthWeight > 0
          ? rounded(entry.revenueGrowthWeighted / entry.revenueGrowthWeight)
          : 0,
      value: rounded(value),
    };
  });

  rolledRows.sort((left, right) => {
    if (right.value !== left.value) return right.value - left.value;
    return String(left.name || "").localeCompare(String(right.name || ""));
  });

  return rolledRows;
}

async function aggregateGeoRowsByRange(query, range) {
  const locationExpr = locationExprForLevel(query.level);
  const pipeline = [
    ...buildBaseStages(query, range),
    {
      $group: {
        _id: {
          location: locationExpr,
          customerId: customerIdExpr,
        },
        customerRevenue: { $sum: revenueExpr },
        customerOrders: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.location",
        revenue: { $sum: "$customerRevenue" },
        orders: { $sum: "$customerOrders" },
        customers: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        name: { $ifNull: ["$_id", "Unknown"] },
        revenue: { $round: ["$revenue", 2] },
        orders: 1,
        customers: 1,
        aov: {
          $round: [
            {
              $cond: [{ $gt: ["$orders", 0] }, { $divide: ["$revenue", "$orders"] }, 0],
            },
            2,
          ],
        },
      },
    },
  ];

  return RawSale.aggregate(pipeline);
}

async function aggregateGeoTotalsByRange(query, range) {
  const pipeline = [
    ...buildBaseStages(query, range),
    {
      $group: {
        _id: customerIdExpr,
        customerRevenue: { $sum: revenueExpr },
        customerOrders: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$customerRevenue" },
        orders: { $sum: "$customerOrders" },
        customers: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        revenue: { $round: ["$revenue", 2] },
        orders: 1,
        customers: 1,
        aov: {
          $round: [
            {
              $cond: [{ $gt: ["$orders", 0] }, { $divide: ["$revenue", "$orders"] }, 0],
            },
            2,
          ],
        },
      },
    },
  ];

  const rows = await RawSale.aggregate(pipeline);
  return (
    rows[0] || {
      revenue: 0,
      orders: 0,
      customers: 0,
      aov: 0,
    }
  );
}

async function aggregateGeoRows(query) {
  const previousRange = buildPreviousRange(query.startDate, query.endDate);

  const [currentRowsRaw, previousRowsRaw] = await Promise.all([
    aggregateGeoRowsByRange(query, query),
    aggregateGeoRowsByRange(query, previousRange),
  ]);

  const currentRows =
    query.level === "world" ? mergeWorldRowsByCountry(currentRowsRaw) : currentRowsRaw;
  const previousRows =
    query.level === "world" ? mergeWorldRowsByCountry(previousRowsRaw) : previousRowsRaw;

  const previousLookup = new Map();
  previousRows.forEach((row) => {
    previousLookup.set(row.name, row);
  });

  const rows = currentRows.map((row) => {
    const previousRow = previousLookup.get(row.name);
    const currentValue = toMetricValue(row, query.metric);
    const previousValue = toMetricValue(previousRow, query.metric);
    const growth = rounded(safeGrowth(currentValue, previousValue));
    const previousRevenue = Number(previousRow?.revenue || 0);
    const revenueGrowth = rounded(safeGrowth(Number(row.revenue || 0), previousRevenue));

    return {
      name: row.name,
      revenue: rounded(row.revenue),
      orders: Number(row.orders || 0),
      aov: rounded(row.aov),
      customers: Number(row.customers || 0),
      revenueGrowth,
      growth,
      value: rounded(currentValue),
    };
  });

  rows.sort((left, right) => {
    if (right.value !== left.value) return right.value - left.value;
    return String(left.name || "").localeCompare(String(right.name || ""));
  });

  return rows;
}

async function aggregateGeoSummary(query) {
  const previousRange = buildPreviousRange(query.startDate, query.endDate);

  const [currentTotals, previousTotals, rows] = await Promise.all([
    aggregateGeoTotalsByRange(query, query),
    aggregateGeoTotalsByRange(query, previousRange),
    aggregateGeoRows({
      ...query,
      level: query.level === "city" ? "state" : query.level,
      metric: "revenue",
    }),
  ]);

  return {
    revenue: rounded(currentTotals.revenue),
    orders: Number(currentTotals.orders || 0),
    aov: rounded(currentTotals.aov),
    customers: Number(currentTotals.customers || 0),
    growth: rounded(safeGrowth(currentTotals.revenue, previousTotals.revenue)),
    topRegion: rows[0]?.name || "N/A",
    comparisons: {
      revenue: rounded(safeGrowth(currentTotals.revenue, previousTotals.revenue)),
      orders: rounded(safeGrowth(currentTotals.orders, previousTotals.orders)),
      aov: rounded(safeGrowth(currentTotals.aov, previousTotals.aov)),
      customers: rounded(safeGrowth(currentTotals.customers, previousTotals.customers)),
    },
  };
}

async function aggregateGeoMap(query) {
  const mapLevel = query.level === "world" ? "world" : "country";
  const rows = await aggregateGeoRows({
    ...query,
    level: mapLevel,
  });

  if (mapLevel === "country" && query.country) {
    const rolledRows = rollupRowsToCountryStates(rows, query.country, query.metric);
    if (rolledRows.length > 0) {
      return rolledRows.slice(0, MAX_LIMIT);
    }
  }

  return rows.slice(0, MAX_LIMIT);
}

async function aggregateGeoTopRegions(query) {
  const rows = await aggregateGeoRows(query);

  if (query.level === "country" && query.country) {
    const rolledRows = rollupRowsToCountryStates(rows, query.country, query.metric);
    if (rolledRows.length > 0) {
      return rolledRows.slice(0, query.limit);
    }
  }

  return rows.slice(0, query.limit);
}

async function aggregateGeoRevenueTrend(query) {
  const periodExpr = {
    $dateTrunc: {
      date: "$timestamp",
      unit: query.groupBy,
      timezone: query.timezone || "UTC",
    },
  };

  const pipeline = [
    ...buildBaseStages(query, query),
    {
      $group: {
        _id: {
          period: periodExpr,
          customerId: customerIdExpr,
        },
        customerRevenue: { $sum: revenueExpr },
        customerOrders: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.period",
        revenue: { $sum: "$customerRevenue" },
        orders: { $sum: "$customerOrders" },
        customers: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        period: "$_id",
        revenue: { $round: ["$revenue", 2] },
        orders: 1,
        customers: 1,
        aov: {
          $round: [
            {
              $cond: [{ $gt: ["$orders", 0] }, { $divide: ["$revenue", "$orders"] }, 0],
            },
            2,
          ],
        },
      },
    },
    { $sort: { period: 1 } },
  ];

  const rows = await RawSale.aggregate(pipeline);
  return rows.map((row) => ({
    ...row,
    value: rounded(toMetricValue(row, query.metric)),
  }));
}

function heatmapRegionExpr(level) {
  if (level === "country") {
    return {
      $ifNull: ["$geography.state", { $ifNull: ["$geography.city", "Unknown"] }],
    };
  }

  if (level === "state" || level === "city") {
    return { $ifNull: ["$geography.city", "Unknown"] };
  }

  return { $ifNull: ["$geography.country", "Unknown"] };
}

async function aggregateGeoCategoryHeatmap(query) {
  const regionExpr = heatmapRegionExpr(query.level);

  const pipeline = [
    ...buildBaseStages(query, query),
    {
      $group: {
        _id: {
          category: { $ifNull: ["$product.category", "Unknown"] },
          region: regionExpr,
        },
        revenue: { $sum: revenueExpr },
        orders: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id.category",
        region: "$_id.region",
        revenue: { $round: ["$revenue", 2] },
        orders: 1,
      },
    },
  ];

  const rows = await RawSale.aggregate(pipeline);
  if (!rows.length) {
    return {
      regions: [],
      categories: [],
      cells: [],
      minRevenue: 0,
      maxRevenue: 0,
    };
  }

  const regionTotals = new Map();
  const categoryTotals = new Map();
  const cellLookup = new Map();

  rows.forEach((row) => {
    const region = row.region || "Unknown";
    const category = row.category || "Unknown";
    const revenue = Number(row.revenue || 0);
    const orders = Number(row.orders || 0);

    regionTotals.set(region, (regionTotals.get(region) || 0) + revenue);
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + revenue);
    cellLookup.set(`${category}::${region}`, {
      revenue,
      orders,
    });
  });

  const topRegions = [...regionTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([region]) => region);

  const topCategories = [...categoryTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([category]) => category);

  const cells = [];
  const categories = topCategories.map((category) => {
    const values = {};
    let totalRevenue = 0;

    topRegions.forEach((region) => {
      const key = `${category}::${region}`;
      const cell = cellLookup.get(key) || { revenue: 0, orders: 0 };
      const revenue = rounded(cell.revenue);
      const orders = Number(cell.orders || 0);
      values[region] = revenue;
      totalRevenue += revenue;

      cells.push({
        category,
        region,
        revenue,
        orders,
      });
    });

    return {
      category,
      totalRevenue: rounded(totalRevenue),
      values,
    };
  });

  const revenues = cells.map((cell) => cell.revenue);

  return {
    regions: topRegions,
    categories,
    cells,
    minRevenue: Math.min(...revenues),
    maxRevenue: Math.max(...revenues),
  };
}

async function fetchTopCategoryForRegion(query, regionName) {
  const regionQuery = { ...query };

  if (query.level === "world") {
    regionQuery.country = regionName;
  } else if (query.level === "country") {
    regionQuery.state = regionName;
  } else {
    regionQuery.city = regionName;
  }

  const pipeline = [
    ...buildBaseStages(regionQuery, regionQuery),
    {
      $group: {
        _id: { $ifNull: ["$product.category", "Unknown"] },
        revenue: { $sum: revenueExpr },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        revenue: { $round: ["$revenue", 2] },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 1 },
  ];

  const rows = await RawSale.aggregate(pipeline);
  return rows[0] || null;
}

async function aggregateGeoInsights(query) {
  const rows = await aggregateGeoRows({
    ...query,
    metric: "revenue",
    limit: Math.max(query.limit || 10, 12),
  });

  if (!rows.length) {
    return {
      insights: [],
    };
  }

  const insights = [];
  const bestGrowth = rows
    .filter((row) => Number(row.growth) > 0)
    .sort((left, right) => right.growth - left.growth)[0];
  const worstGrowth = rows
    .filter((row) => Number(row.growth) < 0)
    .sort((left, right) => left.growth - right.growth)[0];
  const topRevenueRegion = rows[0];

  if (bestGrowth) {
    const topCategory = await fetchTopCategoryForRegion(query, bestGrowth.name);
    const categoryText = topCategory?.category
      ? ` driven by ${topCategory.category} category`
      : "";
    insights.push({
      id: "positive-growth",
      type: "positive",
      text: `Revenue in ${bestGrowth.name} increased by ${Math.abs(
        bestGrowth.growth
      ).toFixed(1)}% in the selected period${categoryText}.`,
    });
  }

  if (worstGrowth) {
    insights.push({
      id: "negative-growth",
      type: "negative",
      text: `Orders in ${worstGrowth.name} dropped ${Math.abs(worstGrowth.growth).toFixed(
        1
      )}% compared to the previous period.`,
    });
  }

  insights.push({
    id: "top-region",
    type: "neutral",
    text: `${topRevenueRegion.name} is currently the top performing region with ${topRevenueRegion.revenue.toLocaleString(
      "en-IN"
    )} revenue across ${topRevenueRegion.orders.toLocaleString("en-IN")} orders.`,
  });

  return {
    insights,
  };
}

function compactDistinctValues(rows) {
  return rows
    .map((item) => item._id)
    .filter((value) => value !== null && value !== undefined && value !== "");
}

async function aggregateGeoFilterOptions(query) {
  const pipeline = [
    ...buildBaseStages(query, query, {
      includeDerivedFields: true,
      skipChannelFilter: true,
    }),
    {
      $facet: {
        regions: [{ $group: { _id: "$geography.region" } }, { $sort: { _id: 1 } }],
        countries: [{ $group: { _id: "$geography.country" } }, { $sort: { _id: 1 } }],
        states: [{ $group: { _id: "$geography.state" } }, { $sort: { _id: 1 } }],
        cities: [{ $group: { _id: "$geography.city" } }, { $sort: { _id: 1 } }],
        categories: [{ $group: { _id: "$product.category" } }, { $sort: { _id: 1 } }],
        products: [
          { $group: { _id: "$product.productName" } },
          { $sort: { _id: 1 } },
          { $limit: 300 },
        ],
        segments: [{ $group: { _id: "$__segmentLabel" } }, { $sort: { _id: 1 } }],
        customerTypes: [{ $group: { _id: "$customer.customerType" } }, { $sort: { _id: 1 } }],
        channels: [{ $group: { _id: "$__channel" } }, { $sort: { _id: 1 } }],
      },
    },
  ];

  const result = await RawSale.aggregate(pipeline);
  const data = result[0] || {};

  return {
    regions: compactDistinctValues(data.regions || []),
    countries: compactDistinctValues(data.countries || []),
    states: compactDistinctValues(data.states || []),
    cities: compactDistinctValues(data.cities || []),
    categories: compactDistinctValues(data.categories || []),
    products: compactDistinctValues(data.products || []),
    segments: compactDistinctValues(data.segments || []),
    customerTypes: compactDistinctValues(data.customerTypes || []),
    channels: compactDistinctValues(data.channels || []),
  };
}

module.exports = {
  parseGeoAnalyticsQuery,
  aggregateGeoSummary,
  aggregateGeoMap,
  aggregateGeoTopRegions,
  aggregateGeoRevenueTrend,
  aggregateGeoCategoryHeatmap,
  aggregateGeoInsights,
  aggregateGeoFilterOptions,
};
