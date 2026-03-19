import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchGeoCategoryHeatmap,
  fetchGeoFilterOptions,
  fetchGeoInsights,
  fetchGeoMap,
  fetchGeoRegionBar,
  fetchGeoRevenueTrend,
  fetchGeoSummary,
  fetchGeoTopRegions,
} from "../Services/mapAnalyticsApi";
import { useDebouncedValue } from "./useDebouncedValue";

const QUERY_PLACEHOLDER = {
  placeholderData: (previous) => previous,
};

const hasHierarchyContext = (filters) => {
  if (filters.level === "world") return true;
  if (filters.level === "country") return Boolean(filters.country);
  if (filters.level === "state") return Boolean(filters.country && filters.state);
  return Boolean(filters.country && filters.state && filters.city);
};

const pickBaseParams = (filters) => ({
  start: filters.start,
  end: filters.end,
  timezone: filters.timezone,
  groupBy:
    filters.mapDateRange === "today"
      ? "hour"
      : filters.groupBy || "day",
  metric: filters.metric,
  mapDateRange: filters.mapDateRange,
  level: filters.level,
  region: filters.region,
  country: filters.country,
  state: filters.state,
  city: filters.city,
  category: filters.category,
  product: filters.product,
  segment: filters.segment,
  customerType: filters.customerType,
  channel: filters.channel,
});

const buildPreviousRange = (startIso, endIso) => {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate.getTime() <= startDate.getTime()
  ) {
    return {
      start: startIso,
      end: endIso,
    };
  }

  const rangeMs = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - rangeMs);

  return {
    start: previousStart.toISOString(),
    end: previousEnd.toISOString(),
  };
};

export const useGeoAnalyticsQueries = (filters, enabled = true) => {
  const baseParams = useMemo(() => pickBaseParams(filters), [filters]);
  const debouncedParams = useDebouncedValue(baseParams, 350);

  const effectiveDebouncedParams = useMemo(() => {
    if (debouncedParams.mapDateRange !== "today" || debouncedParams.groupBy !== "hour") {
      return debouncedParams;
    }

    const rawEnd = new Date(debouncedParams.end);
    if (Number.isNaN(rawEnd.getTime())) return debouncedParams;

    const clampedEnd = new Date(Math.min(rawEnd.getTime(), Date.now())).toISOString();
    return {
      ...debouncedParams,
      end: clampedEnd,
    };
  }, [debouncedParams]);

  const mapLevel =
    effectiveDebouncedParams.level !== "world" && effectiveDebouncedParams.country
      ? "country"
      : "world";

  const mapParams = useMemo(
    () => ({
      ...debouncedParams,
      ...effectiveDebouncedParams,
      level: mapLevel,
      state: "",
      city: "",
      limit: 300,
    }),
    [effectiveDebouncedParams, mapLevel]
  );

  const previousTrendParams = useMemo(() => {
    const previousRange = buildPreviousRange(
      effectiveDebouncedParams.start,
      effectiveDebouncedParams.end,
    );
    return {
      ...effectiveDebouncedParams,
      ...previousRange,
      groupBy: effectiveDebouncedParams.groupBy || "day",
    };
  }, [effectiveDebouncedParams]);

  const canQueryHierarchy = useMemo(
    () => hasHierarchyContext(debouncedParams),
    [debouncedParams]
  );

  const optionsQuery = useQuery({
    queryKey: ["geoAnalytics", "filter-options", effectiveDebouncedParams],
    queryFn: () => fetchGeoFilterOptions({ ...effectiveDebouncedParams, level: "world" }),
    enabled,
    ...QUERY_PLACEHOLDER,
    staleTime: 2 * 60 * 1000,
  });

  const summaryQuery = useQuery({
    queryKey: ["geoAnalytics", "summary", effectiveDebouncedParams],
    queryFn: () => fetchGeoSummary(effectiveDebouncedParams),
    enabled: enabled && canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const mapQuery = useQuery({
    queryKey: ["geoAnalytics", "map", mapParams],
    queryFn: () => fetchGeoMap(mapParams),
    enabled,
    ...QUERY_PLACEHOLDER,
  });

  const topRegionsQuery = useQuery({
    queryKey: ["geoAnalytics", "top-regions", effectiveDebouncedParams],
    queryFn: () => fetchGeoTopRegions({ ...effectiveDebouncedParams, limit: 10 }),
    enabled: enabled && canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const revenueTrendQuery = useQuery({
    queryKey: ["geoAnalytics", "revenue-trend", effectiveDebouncedParams],
    queryFn: () =>
      fetchGeoRevenueTrend({
        ...effectiveDebouncedParams,
        groupBy: effectiveDebouncedParams.groupBy || "day",
      }),
    enabled: enabled && canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const previousRevenueTrendQuery = useQuery({
    queryKey: ["geoAnalytics", "revenue-trend-previous", previousTrendParams],
    queryFn: () => fetchGeoRevenueTrend(previousTrendParams),
    enabled: enabled && canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const regionBarQuery = useQuery({
    queryKey: ["geoAnalytics", "region-bar", effectiveDebouncedParams],
    queryFn: () => fetchGeoRegionBar({ ...effectiveDebouncedParams, limit: 8 }),
    enabled: enabled && canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const categoryHeatmapQuery = useQuery({
    queryKey: ["geoAnalytics", "category-heatmap", effectiveDebouncedParams],
    queryFn: () => fetchGeoCategoryHeatmap(effectiveDebouncedParams),
    enabled: enabled && canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const insightsQuery = useQuery({
    queryKey: ["geoAnalytics", "insights", effectiveDebouncedParams],
    queryFn: () => fetchGeoInsights({ ...effectiveDebouncedParams, limit: 12 }),
    enabled: enabled && canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  return {
    mapLevel,
    debouncedParams: effectiveDebouncedParams,
    optionsQuery,
    summaryQuery,
    mapQuery,
    topRegionsQuery,
    revenueTrendQuery,
    previousRevenueTrendQuery,
    regionBarQuery,
    categoryHeatmapQuery,
    insightsQuery,
  };
};
