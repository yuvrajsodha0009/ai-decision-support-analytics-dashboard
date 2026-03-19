export const ANALYTICS_DATE_PRESET_OPTIONS = [
  { value: "today", label: "Today", shortLabel: "Today" },
  { value: "last7", label: "Last 7 days", shortLabel: "7D" },
  { value: "last30", label: "Last 30 days", shortLabel: "30D" },
  { value: "last90", label: "Last 90 days", shortLabel: "90D" },
  { value: "custom", label: "Custom", shortLabel: "Custom" },
];

export const DEFAULT_ANALYTICS_DATE_PRESET = "last7";

const SAME_DAY_PRESET_ORDER = ["today", "last7", "last30", "last90"];

export const toDateInputValue = (isoDate) => {
  if (!isoDate) return "";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

export const buildStartIso = (inputDate) =>
  new Date(`${inputDate}T00:00:00.000Z`).toISOString();

export const buildEndIso = (inputDate) =>
  new Date(`${inputDate}T23:59:59.999Z`).toISOString();

export const getPresetRange = (preset) => {
  const now = new Date();
  const dayEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  if (preset === "today") {
    const dayStart = new Date(dayEnd);
    dayStart.setUTCHours(0, 0, 0, 0);
    return {
      start: dayStart.toISOString(),
      end: dayEnd.toISOString(),
    };
  }

  const presetDays = {
    last7: 7,
    last30: 30,
    last90: 90,
  };

  const totalDays = presetDays[preset] || 7;
  const start = new Date(dayEnd);
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));
  start.setUTCHours(0, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: dayEnd.toISOString(),
  };
};

const sameInstant = (left, right) => {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
};

export const getPresetFromRange = (startIso, endIso) => {
  for (const preset of SAME_DAY_PRESET_ORDER) {
    const range = getPresetRange(preset);
    if (sameInstant(startIso, range.start) && sameInstant(endIso, range.end)) {
      return preset;
    }
  }

  return "custom";
};

export const normalizeAnalyticsDateRange = (input = {}) => {
  const rawPreset =
    typeof input.preset === "string" ? input.preset.trim().toLowerCase() : "";

  if (rawPreset && SAME_DAY_PRESET_ORDER.includes(rawPreset)) {
    const range = getPresetRange(rawPreset);
    return {
      preset: rawPreset,
      start: range.start,
      end: range.end,
    };
  }

  const startInput = input.start || input.startDate;
  const endInput = input.end || input.endDate;

  if (!startInput || !endInput) {
    const fallback = getPresetRange(DEFAULT_ANALYTICS_DATE_PRESET);
    return {
      preset: DEFAULT_ANALYTICS_DATE_PRESET,
      start: fallback.start,
      end: fallback.end,
    };
  }

  const start = new Date(startInput);
  const end = new Date(endInput);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const fallback = getPresetRange(DEFAULT_ANALYTICS_DATE_PRESET);
    return {
      preset: DEFAULT_ANALYTICS_DATE_PRESET,
      start: fallback.start,
      end: fallback.end,
    };
  }

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const normalized =
    start.getTime() <= end.getTime()
      ? { start: startIso, end: endIso }
      : { start: endIso, end: startIso };

  if (rawPreset === "custom") {
    return {
      preset: "custom",
      ...normalized,
    };
  }

  return {
    preset: getPresetFromRange(normalized.start, normalized.end),
    ...normalized,
  };
};

export const resolveStoredAnalyticsDateRange = (storedPreference) => {
  const normalized = normalizeAnalyticsDateRange(storedPreference);

  if (normalized.preset !== "custom") {
    const liveRange = getPresetRange(normalized.preset);
    return {
      preset: normalized.preset,
      start: liveRange.start,
      end: liveRange.end,
    };
  }

  return normalized;
};

export const formatAnalyticsDateRangeSummary = (startIso, endIso, locale = "en-IN") => {
  const start = new Date(startIso);
  const end = new Date(endIso);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Custom range";
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

export const isSameDateRange = (left = {}, right = {}) =>
  String(left.preset || "") === String(right.preset || "") &&
  String(left.start || "") === String(right.start || "") &&
  String(left.end || "") === String(right.end || "");
