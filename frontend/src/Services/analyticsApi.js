import axios from "axios";

const API_BASE = "http://localhost:5000/api";

const EXCLUDED_FILTER_KEYS = new Set(["compareMode"]);

const buildQueryString = (filters = {}, extra = {}, options = {}) => {
  const params = new URLSearchParams();
  const payload = { ...filters, ...extra };
  const includeCompareMode = Boolean(options.includeCompareMode);

  Object.entries(payload).forEach(([key, value]) => {
    if (EXCLUDED_FILTER_KEYS.has(key) && !(includeCompareMode && key === "compareMode")) {
      return;
    }
    if (value === undefined || value === null || value === "") return;
    params.set(key, value);
  });

  return params.toString();
};

const getWithFilters = async (path, filters, extra = {}, options = {}) => {
  const query = buildQueryString(filters, extra, options);
  const url = query ? `${API_BASE}${path}?${query}` : `${API_BASE}${path}`;
  const response = await axios.get(url);
  return response.data;
};

export const fetchAnalyticsSeries = (filters) =>
  getWithFilters("/analytics", filters);

export const fetchAnalyticsSummary = (filters) =>
  getWithFilters("/analytics/summary", filters, {}, { includeCompareMode: true });

export const fetchAnalyticsByCategory = (filters) =>
  getWithFilters("/analytics/by-category", filters);

export const fetchAnalyticsByRegion = (filters) =>
  getWithFilters("/analytics/by-region", filters);

export const fetchAnalyticsByDevice = (filters) =>
  getWithFilters("/analytics/by-device", filters);

export const fetchAnalyticsFilterOptions = (filters) =>
  getWithFilters("/analytics/filter-options", filters);

export const fetchAdminSales = (filters, page = 1, limit = 50) =>
  getWithFilters("/admin/sales", filters, { page, limit });

export const downloadAdminSalesExport = async (filters) => {
  const query = buildQueryString(filters);
  const url = query
    ? `${API_BASE}/admin/sales/export?${query}`
    : `${API_BASE}/admin/sales/export`;

  const response = await axios.get(url, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const anchor = document.createElement("a");

  const disposition = response.headers?.["content-disposition"] || "";
  const filenameMatch = disposition.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] || `rawsales-export-${Date.now()}.csv`;

  anchor.href = blobUrl;
  anchor.setAttribute("download", filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
};
