import { useCallback, useMemo } from "react";
import { useAnalyticsFilters } from "../context/AnalyticsFiltersContext";
import {
  buildEndIso,
  buildStartIso,
  getPresetFromRange,
  getPresetRange,
  toDateInputValue,
} from "../utils/geoDateRange";

const MAP_FILTER_KEYS = new Set([
  "region",
  "country",
  "state",
  "city",
  "category",
  "product",
  "segment",
  "customerType",
  "channel",
  "groupBy",
  "timezone",
]);

export const useGeoAnalyticsFilters = () => {
  const { filters, setFilters } = useAnalyticsFilters();

  const mapFilters = useMemo(
    () => ({
      start: filters.start,
      end: filters.end,
      timezone: filters.timezone || "UTC",
      groupBy: filters.groupBy || "day",
      dateRange:
        filters.mapDateRange === "custom"
          ? "custom"
          : getPresetFromRange(filters.start, filters.end),
      customStartDate: toDateInputValue(filters.start),
      customEndDate: toDateInputValue(filters.end),
      metric: filters.mapMetric || "revenue",
      level: filters.mapLevel || "world",
      region: filters.region || "",
      country: filters.country || "",
      state: filters.state || "",
      city: filters.city || "",
      category: filters.category || "",
      product: filters.product || "",
      segment: filters.segment || "",
      customerType: filters.customerType || "",
      channel: filters.channel || "",
    }),
    [
      filters.start,
      filters.end,
      filters.timezone,
      filters.groupBy,
      filters.mapDateRange,
      filters.mapMetric,
      filters.mapLevel,
      filters.region,
      filters.country,
      filters.state,
      filters.city,
      filters.category,
      filters.product,
      filters.segment,
      filters.customerType,
      filters.channel,
    ]
  );

  const setGeoFilter = useCallback(
    (key, value) => {
      if (key === "metric") {
        setFilters({ mapMetric: value });
        return;
      }

      if (key === "level") {
        setFilters({ mapLevel: value });
        return;
      }

      if (key === "dateRange") {
        setFilters({ mapDateRange: value });
        return;
      }

      if (MAP_FILTER_KEYS.has(key)) {
        setFilters({ [key]: value });
      }
    },
    [setFilters]
  );

  const setGeoFilters = useCallback(
    (patch = {}) => {
      const nextPatch = {};
      Object.entries(patch).forEach(([key, value]) => {
        if (key === "metric") {
          nextPatch.mapMetric = value;
          return;
        }
        if (key === "level") {
          nextPatch.mapLevel = value;
          return;
        }
        if (key === "dateRange") {
          nextPatch.mapDateRange = value;
          return;
        }
        if (MAP_FILTER_KEYS.has(key)) {
          nextPatch[key] = value;
        }
      });
      setFilters(nextPatch);
    },
    [setFilters]
  );

  const applyDatePreset = useCallback(
    (preset) => {
      if (preset === "custom") {
        setFilters({ mapDateRange: "custom" });
        return;
      }

      const range = getPresetRange(preset);
      setFilters({
        mapDateRange: preset,
        start: range.start,
        end: range.end,
      });
    },
    [setFilters]
  );

  const applyCustomDateRange = useCallback(
    (startDate, endDate) => {
      if (!startDate || !endDate) return;

      let nextStartDate = startDate;
      let nextEndDate = endDate;
      let startIso = buildStartIso(startDate);
      let endIso = buildEndIso(endDate);

      if (new Date(startIso).getTime() > new Date(endIso).getTime()) {
        nextStartDate = endDate;
        nextEndDate = startDate;
        startIso = buildStartIso(endDate);
        endIso = buildEndIso(startDate);
      }

      setFilters({
        mapDateRange: "custom",
        start: startIso,
        end: endIso,
      });

      return {
        startDate: nextStartDate,
        endDate: nextEndDate,
      };
    },
    [setFilters]
  );

  const drillToLevel = useCallback(
    (level, value = "") => {
      const normalized = String(value || "").trim();
      if (level === "world") {
        setFilters({
          mapLevel: "world",
          country: "",
          state: "",
          city: "",
        });
        return;
      }

      if (level === "country") {
        setFilters({
          mapLevel: "country",
          country: normalized,
          state: "",
          city: "",
        });
        return;
      }

      if (level === "state") {
        setFilters({
          mapLevel: "state",
          state: normalized,
          city: "",
        });
        return;
      }

      if (level === "city") {
        setFilters({
          mapLevel: "city",
          city: normalized,
        });
      }
    },
    [setFilters]
  );

  return {
    mapFilters,
    setGeoFilter,
    setGeoFilters,
    applyDatePreset,
    applyCustomDateRange,
    drillToLevel,
  };
};
