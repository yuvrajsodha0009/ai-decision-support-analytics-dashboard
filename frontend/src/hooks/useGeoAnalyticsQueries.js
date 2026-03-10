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
  groupBy: filters.groupBy,
  metric: filters.metric,
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

export const useGeoAnalyticsQueries = (filters) => {
  const baseParams = useMemo(() => pickBaseParams(filters), [filters]);
  const debouncedParams = useDebouncedValue(baseParams, 350);

  const mapLevel =
    debouncedParams.level !== "world" && debouncedParams.country ? "country" : "world";

  const mapParams = useMemo(
    () => ({
      ...debouncedParams,
      level: mapLevel,
      state: "",
      city: "",
      limit: 300,
    }),
    [debouncedParams, mapLevel]
  );

  const previousTrendParams = useMemo(() => {
    const previousRange = buildPreviousRange(debouncedParams.start, debouncedParams.end);
    return {
      ...debouncedParams,
      ...previousRange,
      groupBy: debouncedParams.groupBy || "day",
    };
  }, [debouncedParams]);

  const canQueryHierarchy = useMemo(
    () => hasHierarchyContext(debouncedParams),
    [debouncedParams]
  );

  const optionsQuery = useQuery({
    queryKey: ["geoAnalytics", "filter-options", debouncedParams],
    queryFn: () => fetchGeoFilterOptions({ ...debouncedParams, level: "world" }),
    ...QUERY_PLACEHOLDER,
    staleTime: 2 * 60 * 1000,
  });

  const summaryQuery = useQuery({
    queryKey: ["geoAnalytics", "summary", debouncedParams],
    queryFn: () => fetchGeoSummary(debouncedParams),
    enabled: canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const mapQuery = useQuery({
    queryKey: ["geoAnalytics", "map", mapParams],
    queryFn: () => fetchGeoMap(mapParams),
    ...QUERY_PLACEHOLDER,
  });

  const topRegionsQuery = useQuery({
    queryKey: ["geoAnalytics", "top-regions", debouncedParams],
    queryFn: () => fetchGeoTopRegions({ ...debouncedParams, limit: 10 }),
    enabled: canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const revenueTrendQuery = useQuery({
    queryKey: ["geoAnalytics", "revenue-trend", debouncedParams],
    queryFn: () =>
      fetchGeoRevenueTrend({ ...debouncedParams, groupBy: debouncedParams.groupBy || "day" }),
    enabled: canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const previousRevenueTrendQuery = useQuery({
    queryKey: ["geoAnalytics", "revenue-trend-previous", previousTrendParams],
    queryFn: () => fetchGeoRevenueTrend(previousTrendParams),
    enabled: canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const regionBarQuery = useQuery({
    queryKey: ["geoAnalytics", "region-bar", debouncedParams],
    queryFn: () => fetchGeoRegionBar({ ...debouncedParams, limit: 8 }),
    enabled: canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const categoryHeatmapQuery = useQuery({
    queryKey: ["geoAnalytics", "category-heatmap", debouncedParams],
    queryFn: () => fetchGeoCategoryHeatmap(debouncedParams),
    enabled: canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  const insightsQuery = useQuery({
    queryKey: ["geoAnalytics", "insights", debouncedParams],
    queryFn: () => fetchGeoInsights({ ...debouncedParams, limit: 12 }),
    enabled: canQueryHierarchy,
    ...QUERY_PLACEHOLDER,
  });

  return {
    mapLevel,
    debouncedParams,
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
