import axios from "axios";

const API_BASE = "http://localhost:5000/api";

const setParamIfPresent = (params, key, value) => {
  if (value === undefined || value === null || value === "") return;
  params.set(key, value);
};

export const fetchCategoryAnalytics = async (
  categoryName,
  filters = {},
  breakdownOrOptions = "subcategory"
) => {
  const params = new URLSearchParams();

  let breakdown = "subcategory";
  let metric = "";
  let chartType = "";
  if (typeof breakdownOrOptions === "string") {
    breakdown = breakdownOrOptions;
  } else if (breakdownOrOptions && typeof breakdownOrOptions === "object") {
    breakdown = breakdownOrOptions.breakdown || breakdown;
    metric = breakdownOrOptions.metric || "";
    chartType = breakdownOrOptions.chartType || "";
  }

  if (filters.breakdown) breakdown = filters.breakdown;
  if (filters.metric && !metric) metric = filters.metric;
  if (filters.chartType && !chartType) chartType = filters.chartType;

  const start = filters.start || filters.startDate;
  const end = filters.end || filters.endDate;

  setParamIfPresent(params, "startDate", start);
  setParamIfPresent(params, "endDate", end);
  setParamIfPresent(params, "start", start);
  setParamIfPresent(params, "end", end);
  setParamIfPresent(params, "groupBy", filters.groupBy);
  setParamIfPresent(params, "timezone", filters.timezone);
  setParamIfPresent(params, "breakdown", breakdown);
  setParamIfPresent(params, "metric", metric);
  setParamIfPresent(params, "chartType", chartType);

  const encodedCategory = encodeURIComponent(categoryName || "");
  const query = params.toString();
  const url = query
    ? `${API_BASE}/category-analytics/${encodedCategory}?${query}`
    : `${API_BASE}/category-analytics/${encodedCategory}`;

  const response = await axios.get(url);
  return response.data;
};
