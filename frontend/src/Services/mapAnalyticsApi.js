import axios from "axios";

const API_BASE = "http://localhost:5000/api";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, value);
  });

  return searchParams.toString();
};

const getWithParams = async (path, params = {}) => {
  const query = buildQueryString(params);
  const url = query ? `${API_BASE}${path}?${query}` : `${API_BASE}${path}`;
  const response = await axios.get(url);
  return response.data;
};

export const fetchMapAnalytics = async (params = {}) => {
  return getWithParams("/map-analytics", params);
};

export const fetchMapGeoJson = async (params = {}) => {
  return getWithParams("/map-geojson", params);
};

export const fetchGeoSummary = (params = {}) =>
  getWithParams("/analytics/geo/summary", params);

export const fetchGeoMap = (params = {}) =>
  getWithParams("/analytics/geo/map", params);

export const fetchGeoTopRegions = (params = {}) =>
  getWithParams("/analytics/geo/top-regions", params);

export const fetchGeoRevenueTrend = (params = {}) =>
  getWithParams("/analytics/geo/revenue-trend", params);

export const fetchGeoRegionBar = (params = {}) =>
  getWithParams("/analytics/geo/region-bar", params);

export const fetchGeoCategoryHeatmap = (params = {}) =>
  getWithParams("/analytics/geo/category-heatmap", params);

export const fetchGeoInsights = (params = {}) =>
  getWithParams("/analytics/geo/insights", params);

export const fetchGeoFilterOptions = (params = {}) =>
  getWithParams("/analytics/geo/filter-options", params);
