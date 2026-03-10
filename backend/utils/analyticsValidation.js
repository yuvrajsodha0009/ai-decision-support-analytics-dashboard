const ALLOWED_GROUP_BY = new Set(["hour", "day", "week", "month"]);
const MAX_FILTER_LENGTH = 120;
const MAX_HOURLY_RANGE_DAYS = 31;
const TIMEZONE_ALIASES = {
  "Asia/Calcutta": "Asia/Kolkata",
};

function parseIsoDate(raw, fieldName) {
  if (!raw || typeof raw !== "string") {
    return { error: `${fieldName} is required and must be an ISO date` };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${fieldName} must be a valid ISO date` };
  }
  return { value: parsed };
}

function normalizeOptionalString(value, fieldName) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    return { error: `${fieldName} must be a string` };
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_FILTER_LENGTH) {
    return { error: `${fieldName} exceeds max length ${MAX_FILTER_LENGTH}` };
  }
  return { value: trimmed };
}

function validateTimezone(timezone) {
  if (!timezone) return {};
  if (typeof timezone !== "string") {
    return { error: "timezone must be a valid IANA timezone string" };
  }
  const trimmed = timezone.trim();
  const normalized = TIMEZONE_ALIASES[trimmed] || trimmed;
  try {
    // Throws RangeError for invalid timezone identifiers.
    new Intl.DateTimeFormat("en-US", { timeZone: normalized });
    return { value: normalized };
  } catch (_) {
    return { error: "timezone must be a valid IANA timezone string" };
  }
}

function parseOptionalBoolean(rawValue, fieldName) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return { value: false };
  }

  if (typeof rawValue === "boolean") {
    return { value: rawValue };
  }

  const normalized = String(rawValue).trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return { value: true };
  if (normalized === "false" || normalized === "0") return { value: false };

  return { error: `${fieldName} must be a boolean` };
}

function validateAndNormalizeAnalyticsQuery(query) {
  const startResult = parseIsoDate(query.start, "start");
  if (startResult.error) return { error: startResult.error };

  const endResult = parseIsoDate(query.end, "end");
  if (endResult.error) return { error: endResult.error };

  const start = startResult.value;
  const end = endResult.value;

  if (start >= end) {
    return { error: "start must be before end" };
  }

  const groupBy = query.groupBy ? String(query.groupBy).toLowerCase() : "day";
  if (!ALLOWED_GROUP_BY.has(groupBy)) {
    return { error: "groupBy must be one of hour, day, week, month" };
  }

  const timezoneResult = validateTimezone(query.timezone || "UTC");
  if (timezoneResult.error) return { error: timezoneResult.error };

  const compareModeResult = parseOptionalBoolean(query.compareMode, "compareMode");
  if (compareModeResult.error) return { error: compareModeResult.error };

  const rangeMs = end.getTime() - start.getTime();
  const rangeDays = rangeMs / (1000 * 60 * 60 * 24);
  if (groupBy === "hour" && rangeDays > MAX_HOURLY_RANGE_DAYS) {
    return {
      error: `hour grouping supports max ${MAX_HOURLY_RANGE_DAYS} days per request`,
    };
  }

  const optionalFields = [
    "region",
    "country",
    "category",
    "subcategory",
    "device",
  ];

  const filters = {};
  for (const field of optionalFields) {
    const result = normalizeOptionalString(query[field], field);
    if (result && result.error) return { error: result.error };
    if (result && result.value) filters[field] = result.value;
  }

  return {
    value: {
      start,
      end,
      groupBy,
      timezone: timezoneResult.value || "UTC",
      compareMode: compareModeResult.value,
      filters,
    },
  };
}

module.exports = {
  validateAndNormalizeAnalyticsQuery,
};
