export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const formatPercent = (value, digits = 1) =>
  `${Number(value || 0).toFixed(digits)}%`;

export const formatMetricValue = (metric, value) => {
  if (metric === "orders" || metric === "customers") {
    return formatNumber(value);
  }
  if (metric === "aov") {
    return formatCurrency(value);
  }
  return formatCurrency(value);
};

export const formatDelta = (value) => {
  const numeric = Number(value || 0);
  const prefix = numeric >= 0 ? "+" : "-";
  return `${prefix}${Math.abs(numeric).toFixed(1)}%`;
};
