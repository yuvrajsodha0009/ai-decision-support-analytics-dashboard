import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, ChevronLeft, LineChart as LineChartIcon } from "lucide-react";
import { useAnalyticsFilters } from "../context/AnalyticsFiltersContext";
import { fetchCategoryAnalytics } from "../Services/categoryAnalyticsApi";
import { fetchAnalyticsFilterOptions } from "../Services/analyticsApi";

const LINE_COLORS = [
  "#7aa2ff",
  "#66c2a5",
  "#f2a65a",
  "#9d7be8",
  "#4dd0e1",
  "#ef767a",
  "#8fbf26",
  "#5e81ac",
  "#e0ac69",
  "#86c5da",
];

const METRIC_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "orders", label: "Orders" },
  { value: "aov", label: "Average Order Value" },
  { value: "revenueShare", label: "Revenue Share %" },
];

const BREAKDOWN_OPTIONS = [
  { value: "subcategory", label: "Subcategory" },
  { value: "device", label: "Device" },
  { value: "region", label: "Region" },
];

const BREAKDOWN_LABELS = {
  subcategory: "Subcategory",
  device: "Device",
  region: "Region",
};

const METRIC_LABELS = {
  revenue: "Revenue",
  orders: "Orders",
  aov: "Average Order Value",
  revenueShare: "Revenue Share %",
};

const PRESET_OPTIONS = [
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "custom", label: "Custom" },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

const formatMetricValue = (metric, value) => {
  if (metric === "orders") return formatNumber(value);
  if (metric === "revenueShare") return formatPercent(value);
  return formatCurrency(value);
};

const formatMetricTick = (metric, value) => {
  if (metric === "orders") return formatNumber(value);
  if (metric === "revenueShare") return `${Math.round(Number(value || 0))}%`;
  return formatCurrency(value);
};

const decodeCategory = (value) => {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getNextSortDirection = (currentSort, key) => {
  if (currentSort.key !== key) return key === "subcategory" ? "asc" : "desc";
  return currentSort.direction === "asc" ? "desc" : "asc";
};

const toDateInputValue = (isoDate) => {
  if (!isoDate) return "";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const buildStartIso = (inputDate) =>
  new Date(`${inputDate}T00:00:00.000Z`).toISOString();
const buildEndIso = (inputDate) =>
  new Date(`${inputDate}T23:59:59.999Z`).toISOString();

const getPresetRange = (preset) => {
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

  const presetDays = {
    last7: 7,
    last30: 30,
    last90: 90,
  };

  const totalDays = presetDays[preset] || 30;
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

const getPresetFromRange = (startIso, endIso) => {
  for (const preset of ["last7", "last30", "last90"]) {
    const range = getPresetRange(preset);
    if (sameInstant(startIso, range.start) && sameInstant(endIso, range.end)) {
      return preset;
    }
  }
  return "custom";
};

const formatDateTick = (value, groupBy) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  if (groupBy === "hour") {
    return parsed.toLocaleString("en-IN", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
    });
  }

  if (groupBy === "month") {
    return parsed.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  }

  if (groupBy === "week") {
    return `Wk ${parsed.toLocaleDateString("en-IN", {
      month: "short",
      day: "2-digit",
    })}`;
  }

  return parsed.toLocaleDateString("en-IN", {
    month: "short",
    day: "2-digit",
  });
};

const CategoryAnalytics = () => {
  const navigate = useNavigate();
  const { categoryName } = useParams();
  const { filters, setFilters } = useAnalyticsFilters();

  const allowedGroupBy = new Set(["day", "week", "month"]);
  const initialGroupBy = allowedGroupBy.has(filters.groupBy) ? filters.groupBy : "day";

  const categoryLabel = useMemo(
    () => decodeCategory(categoryName).trim(),
    [categoryName]
  );

  const [chartData, setChartData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [activeSubcategories, setActiveSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "revenue",
    direction: "desc",
  });
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [selectedBreakdown, setSelectedBreakdown] = useState("subcategory");
  const [localGroupBy, setLocalGroupBy] = useState(initialGroupBy);
  const [hoveredSubcategory, setHoveredSubcategory] = useState("");
  const [selectedDateRangePreset, setSelectedDateRangePreset] = useState(() =>
    getPresetFromRange(filters.start, filters.end)
  );
  const [customStartDate, setCustomStartDate] = useState(() =>
    toDateInputValue(filters.start)
  );
  const [customEndDate, setCustomEndDate] = useState(() =>
    toDateInputValue(filters.end)
  );
  const [chartType, setChartType] = useState("line");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [showTotalSeries, setShowTotalSeries] = useState(false);
  const [hasAppliedInitialLast30, setHasAppliedInitialLast30] = useState(false);

  useEffect(() => {
    setSelectedDateRangePreset(getPresetFromRange(filters.start, filters.end));
    setCustomStartDate(toDateInputValue(filters.start));
    setCustomEndDate(toDateInputValue(filters.end));
  }, [filters.start, filters.end]);

  useEffect(() => {
    if (hasAppliedInitialLast30) return;

    const initialPreset = getPresetFromRange(filters.start, filters.end);
    if (initialPreset === "custom") {
      const range = getPresetRange("last30");
      setSelectedDateRangePreset("last30");
      setCustomStartDate(toDateInputValue(range.start));
      setCustomEndDate(toDateInputValue(range.end));
      setFilters({
        start: range.start,
        end: range.end,
      });
    }

    setHasAppliedInitialLast30(true);
  }, [hasAppliedInitialLast30, filters.start, filters.end, setFilters]);

  useEffect(() => {
    setShowTotalSeries(false);
  }, [categoryLabel]);

  useEffect(() => {
    let cancelled = false;

    const loadCategoryOptions = async () => {
      setCategoriesLoading(true);
      setCategoriesError("");

      try {
        const options = await fetchAnalyticsFilterOptions({
          start: filters.start,
          end: filters.end,
          timezone: filters.timezone,
          groupBy: filters.groupBy || "day",
          region: filters.region,
          country: filters.country,
          device: filters.device,
          category: "",
          subcategory: "",
        });

        if (cancelled) return;

        const availableCategories = Array.isArray(options?.categories)
          ? options.categories
          : [];

        const normalized = Array.from(
          new Set(
            availableCategories
              .map((value) => String(value || "").trim())
              .filter(Boolean)
          )
        ).sort((left, right) => left.localeCompare(right));

        if (categoryLabel && !normalized.includes(categoryLabel)) {
          normalized.unshift(categoryLabel);
        }

        setCategories(normalized);
      } catch {
        if (cancelled) return;
        setCategories(categoryLabel ? [categoryLabel] : []);
        setCategoriesError("Category list unavailable.");
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };

    loadCategoryOptions();
    return () => {
      cancelled = true;
    };
  }, [
    filters.start,
    filters.end,
    filters.timezone,
    filters.groupBy,
    filters.region,
    filters.country,
    filters.device,
    categoryLabel,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      if (!categoryLabel) {
        setError("Category is missing from the route.");
        setChartData([]);
        setTableData([]);
        setSubcategories([]);
        setActiveSubcategories([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetchCategoryAnalytics(
          categoryLabel,
          {
            start: filters.start,
            end: filters.end,
            groupBy: localGroupBy,
            timezone: filters.timezone,
          },
          {
            breakdown: selectedBreakdown,
            metric: selectedMetric,
            chartType,
          }
        );

        if (cancelled) return;

        const nextChartData = Array.isArray(response?.chartData)
          ? response.chartData
          : [];
        const nextTableData = Array.isArray(response?.tableData)
          ? response.tableData
          : [];
        const nextSubcategories = Array.isArray(response?.subcategories)
          ? response.subcategories
          : [];

        setChartData(nextChartData);
        setTableData(nextTableData);
        setSubcategories(nextSubcategories);
        setActiveSubcategories((previous) => {
          const kept = previous.filter((value) => nextSubcategories.includes(value));
          return kept.length > 0 ? kept : nextSubcategories;
        });
      } catch (requestError) {
        if (cancelled) return;
        setError(
          requestError?.response?.data?.message ||
            "Failed to load category analytics."
        );
        setChartData([]);
        setTableData([]);
        setSubcategories([]);
        setActiveSubcategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [
    categoryLabel,
    filters.start,
    filters.end,
    filters.timezone,
    localGroupBy,
    selectedBreakdown,
    selectedMetric,
    chartType,
  ]);

  const totalRow = useMemo(() => {
    const totalRevenue = tableData.reduce(
      (sum, row) => sum + Number(row.revenue || 0),
      0
    );
    const totalOrders = tableData.reduce(
      (sum, row) => sum + Number(row.orders || 0),
      0
    );
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return {
      revenue: totalRevenue,
      orders: totalOrders,
      aov,
      revenueShare: tableData.length > 0 ? 100 : 0,
    };
  }, [tableData]);

  const sortedTableData = useMemo(() => {
    const rows = [...tableData];
    rows.sort((a, b) => {
      if (sortConfig.key === "subcategory") {
        const left = String(a.subcategory || "").toLowerCase();
        const right = String(b.subcategory || "").toLowerCase();
        const result = left.localeCompare(right);
        return sortConfig.direction === "asc" ? result : -result;
      }

      const left = Number(a[sortConfig.key] || 0);
      const right = Number(b[sortConfig.key] || 0);
      const result = left - right;
      return sortConfig.direction === "asc" ? result : -result;
    });
    return rows;
  }, [tableData, sortConfig]);

  const barChartData = useMemo(() => {
    if (chartType !== "bar") return [];
    const rows = chartData.filter(
      (row) =>
        row &&
        typeof row.name === "string" &&
        activeSubcategories.includes(row.name)
    );

    if (showTotalSeries) {
      const totalMetricValue =
        selectedMetric === "orders"
          ? totalRow.orders
          : selectedMetric === "aov"
            ? totalRow.aov
            : selectedMetric === "revenueShare"
              ? totalRow.revenueShare
              : totalRow.revenue;

      rows.unshift({
        name: "Total",
        value: Number(totalMetricValue || 0),
        __isTotal: true,
      });
    }

    return rows;
  }, [
    chartData,
    activeSubcategories,
    chartType,
    showTotalSeries,
    selectedMetric,
    totalRow,
  ]);

  const lineChartData = useMemo(() => {
    if (chartType !== "line") return chartData;
    return chartData.map((row) => {
      const totalValue = subcategories.reduce(
        (sum, breakdownValue) => sum + Number(row?.[breakdownValue] || 0),
        0
      );
      return {
        ...row,
        __total: totalValue,
      };
    });
  }, [chartData, subcategories, chartType]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: getNextSortDirection(prev, key),
    }));
  };

  const handleToggleSubcategory = (subcategory) => {
    setActiveSubcategories((prev) =>
      prev.includes(subcategory)
        ? prev.filter((item) => item !== subcategory)
        : [...prev, subcategory]
    );
  };

  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? " ^" : " v";
  };

  const colorMap = useMemo(() => {
    const map = {};
    subcategories.forEach((subcategory, index) => {
      map[subcategory] = LINE_COLORS[index % LINE_COLORS.length];
    });
    return map;
  }, [subcategories]);

  const breakdownLabel = BREAKDOWN_LABELS[selectedBreakdown] || "Subcategory";
  const metricLabel = METRIC_LABELS[selectedMetric] || "Revenue";
  const chartHeading =
    chartType === "line"
      ? `${metricLabel} Over Time - by ${breakdownLabel}`
      : `${metricLabel} by ${breakdownLabel}`;

  const inputClassName =
    "h-8 rounded-md border border-[#3a3a3a] bg-[#232323] px-2.5 text-xs text-[#e6e6e6] outline-none transition-colors focus:border-[#6c6c6c]";
  const highlightedInputClassName =
    "h-8 rounded-md border border-[#5a6b8c] bg-[#243047] px-2.5 text-xs text-[#e6f0ff] outline-none transition-colors focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8]/40";
  const secondaryInputClassName =
    "h-8 rounded-md border border-[#475773] bg-[#1f2a3d] px-2.5 text-xs text-[#d8e4f6] outline-none transition-colors focus:border-[#7ea2dc] focus:ring-1 focus:ring-[#7ea2dc]/35";
  const controlLabelClassName = "text-[10px] uppercase tracking-wide text-[#9aa0a6]";

  const handleDatePresetChange = (presetValue) => {
    setSelectedDateRangePreset(presetValue);
    if (presetValue === "custom") return;

    const range = getPresetRange(presetValue);
    setFilters({
      start: range.start,
      end: range.end,
    });
  };

  const applyCustomRange = () => {
    if (!customStartDate || !customEndDate) return;

    let startIso = buildStartIso(customStartDate);
    let endIso = buildEndIso(customEndDate);
    let nextStartDate = customStartDate;
    let nextEndDate = customEndDate;
    if (new Date(startIso).getTime() > new Date(endIso).getTime()) {
      [startIso, endIso] = [buildStartIso(customEndDate), buildEndIso(customStartDate)];
      [nextStartDate, nextEndDate] = [customEndDate, customStartDate];
    }

    setCustomStartDate(nextStartDate);
    setCustomEndDate(nextEndDate);

    setFilters({
      start: startIso,
      end: endIso,
    });
  };

  const handleCategoryChange = (nextCategory) => {
    const normalized = String(nextCategory || "").trim();
    if (!normalized || normalized === categoryLabel) return;
    navigate(`/dashboard/category/${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(99,102,241,0.14),transparent_32%),linear-gradient(135deg,#020617_0%,#0b1220_45%,#111827_100%)] px-4 py-4 text-[#e6e6e6] sm:px-5 lg:px-6 lg:py-5">
      <div className="mx-auto w-full max-w-[1500px]">
        <p className="mb-1 text-xs text-[#9aa0a6]">
          Dashboard &gt; {categoryLabel || "Category"}
        </p>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-[#f1f3f4]">
            {categoryLabel || "Category"} Analytics
          </h1>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-500/40 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-100 transition-colors hover:border-cyan-400/45 hover:bg-slate-800/75 hover:text-cyan-100"
          >
            <ChevronLeft size={14} />
            Back
          </button>
        </div>

        <div className="mb-3 rounded-xl border border-white/10 bg-slate-900/55 backdrop-blur-sm">
          <div className="flex flex-wrap items-end gap-2 border-b border-white/10 px-3 py-2">
            <label className="flex min-w-[170px] flex-col gap-1">
              <span className={`${controlLabelClassName} text-[#b8c7e0]`}>Date Range</span>
              <select
                value={selectedDateRangePreset}
                onChange={(e) => handleDatePresetChange(e.target.value)}
                className={highlightedInputClassName}
              >
                {PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-[200px] flex-col gap-1">
              <span className={`${controlLabelClassName} text-[#b8c7e0]`}>Category</span>
              <select
                value={categoryLabel}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className={highlightedInputClassName}
                disabled={categoriesLoading && categories.length === 0}
              >
                {(categories.length > 0 ? categories : [categoryLabel || ""]).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {categoriesError && (
                <span className="text-[10px] text-[#b98585]">{categoriesError}</span>
              )}
            </label>
          </div>

          {selectedDateRangePreset === "custom" && (
            <div className="flex flex-wrap items-end gap-2 border-b border-white/10 px-3 py-2">
              <label className="flex min-w-[150px] flex-col gap-1">
                <span className={controlLabelClassName}>Start</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  className={inputClassName}
                />
              </label>
              <label className="flex min-w-[150px] flex-col gap-1">
                <span className={controlLabelClassName}>End</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  className={inputClassName}
                />
              </label>
              <button
                type="button"
                onClick={applyCustomRange}
                className="h-8 rounded-md border border-[#3a3a3a] bg-[#2b2b2b] px-3 text-xs text-[#e6e6e6] transition-colors hover:bg-[#313131]"
              >
                Apply
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 px-3 py-2">
            <label className="flex min-w-[130px] flex-col gap-1">
              <span className={`${controlLabelClassName} text-[#9fb2cf]`}>Metric</span>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className={secondaryInputClassName}
              >
                {METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-[170px] flex-col gap-1">
              <span className={`${controlLabelClassName} text-[#9fb2cf]`}>Breakdown</span>
              <select
                value={selectedBreakdown}
                onChange={(e) => setSelectedBreakdown(e.target.value)}
                className={secondaryInputClassName}
              >
                {BREAKDOWN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-[110px] flex-col gap-1">
              <span className={`${controlLabelClassName} text-[#9fb2cf]`}>Group By</span>
              <select
                value={localGroupBy}
                onChange={(e) => setLocalGroupBy(e.target.value)}
                className={secondaryInputClassName}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </label>

          </div>
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#eceff1]">{chartHeading}</h2>
          <div className="inline-flex h-8 rounded-md border border-[#5a6b8c] bg-[#243047] p-0.5 shadow-[0_0_0_1px_rgba(138,180,248,0.15)]">
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`inline-flex items-center gap-1 rounded px-2 text-xs transition-colors ${
                chartType === "line"
                  ? "bg-[#32476b] text-[#eaf2ff]"
                  : "text-[#c7d5ea] hover:text-[#f1f6ff]"
              }`}
            >
              <LineChartIcon size={13} />
              Line
            </button>
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`inline-flex items-center gap-1 rounded px-2 text-xs transition-colors ${
                chartType === "bar"
                  ? "bg-[#32476b] text-[#eaf2ff]"
                  : "text-[#c7d5ea] hover:text-[#f1f6ff]"
              }`}
            >
              <BarChart3 size={13} />
              Bar
            </button>
          </div>
        </div>

        {loading && <p className="py-4 text-sm text-[#9aa0a6]">Loading category analytics...</p>}
        {!loading && error && <p className="py-4 text-sm text-rose-400">{error}</p>}

        {!loading && !error && (
          <div className="h-[480px] w-full overflow-x-auto">
            <div className="h-full min-w-[920px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "line" ? (
                  <LineChart data={lineChartData} margin={{ top: 10, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid vertical={false} stroke="#3a3a3a" strokeOpacity={0.45} />
                    <XAxis
                      dataKey="date"
                      stroke="#9aa0a6"
                      tick={{ fill: "#9aa0a6", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => formatDateTick(value, localGroupBy)}
                      minTickGap={22}
                    />
                    <YAxis
                      stroke="#9aa0a6"
                      tick={{ fill: "#9aa0a6", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={selectedMetric === "revenueShare" ? 80 : 112}
                      tickMargin={8}
                      tickFormatter={(value) => formatMetricTick(selectedMetric, value)}
                    />
                    <Tooltip
                      formatter={(value) => formatMetricValue(selectedMetric, value)}
                      contentStyle={{
                        background: "#242424",
                        border: "1px solid #424242",
                        color: "#eceff1",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#e0e0e0" }}
                    />

                    {activeSubcategories.map((subcategory) => {
                      const isRowHovered = hoveredSubcategory === subcategory;
                      const hasRowHover = Boolean(hoveredSubcategory);
                      const stroke = colorMap[subcategory] || LINE_COLORS[0];

                      return (
                        <Line
                          key={subcategory}
                          type="monotone"
                          dataKey={subcategory}
                          stroke={stroke}
                          strokeWidth={isRowHovered ? 2.4 : 1.8}
                          strokeOpacity={hasRowHover ? (isRowHovered ? 1 : 0.25) : 0.9}
                          dot={false}
                          activeDot={false}
                          isAnimationActive
                        />
                      );
                    })}

                    {showTotalSeries && (
                      <Line
                        type="monotone"
                        dataKey="__total"
                        stroke="#f1f5f9"
                        strokeWidth={2.6}
                        strokeOpacity={0.95}
                        dot={false}
                        activeDot={false}
                        isAnimationActive
                      />
                    )}
                  </LineChart>
                ) : (
                  <BarChart data={barChartData} margin={{ top: 10, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid vertical={false} stroke="#3a3a3a" strokeOpacity={0.45} />
                    <XAxis
                      dataKey="name"
                      stroke="#9aa0a6"
                      tick={{ fill: "#9aa0a6", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={18}
                    />
                    <YAxis
                      stroke="#9aa0a6"
                      tick={{ fill: "#9aa0a6", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={selectedMetric === "revenueShare" ? 80 : 112}
                      tickMargin={8}
                      tickFormatter={(value) => formatMetricTick(selectedMetric, value)}
                    />
                    <Tooltip
                      formatter={(value) => formatMetricValue(selectedMetric, value)}
                      contentStyle={{
                        background: "#242424",
                        border: "1px solid #424242",
                        color: "#eceff1",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#e0e0e0" }}
                    />

                    <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive>
                      {barChartData.map((entry) => {
                        const isTotalBar = Boolean(entry.__isTotal);
                        const isRowHovered = hoveredSubcategory === entry.name;
                        const hasRowHover = Boolean(hoveredSubcategory);
                        const fillColor = isTotalBar
                          ? "#e2e8f0"
                          : colorMap[entry.name] || LINE_COLORS[0];
                        const fillOpacity = isTotalBar
                          ? 0.98
                          : hasRowHover
                            ? (isRowHovered ? 0.95 : 0.25)
                            : 0.88;
                        return (
                          <Cell
                            key={`bar-cell-${entry.name}`}
                            fill={fillColor}
                            fillOpacity={fillOpacity}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!loading && !error && chartData.length > 0 && activeSubcategories.length === 0 && (
          <p className="py-3 text-xs text-[#d4a650]">
            No values selected. Enable {breakdownLabel.toLowerCase()} entries from the table below.
          </p>
        )}

        <div className="mt-2 border-t border-[#333]" />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#333] text-[#9aa0a6]">
                <th className="px-2 py-2 text-left font-medium">Checkbox</th>
                <th className="px-2 py-2 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("subcategory")}
                    className="text-left text-[#b8bdc3] transition-colors hover:text-[#eceff1]"
                  >
                    {breakdownLabel}
                    {sortIndicator("subcategory")}
                  </button>
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("revenue")}
                    className="text-right text-[#b8bdc3] transition-colors hover:text-[#eceff1]"
                  >
                    Revenue{sortIndicator("revenue")}
                  </button>
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("orders")}
                    className="text-right text-[#b8bdc3] transition-colors hover:text-[#eceff1]"
                  >
                    Orders{sortIndicator("orders")}
                  </button>
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("aov")}
                    className="text-right text-[#b8bdc3] transition-colors hover:text-[#eceff1]"
                  >
                    AOV{sortIndicator("aov")}
                  </button>
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("revenueShare")}
                    className="text-right text-[#b8bdc3] transition-colors hover:text-[#eceff1]"
                  >
                    Revenue Share %{sortIndicator("revenueShare")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && (
                <tr
                  className={`border-b border-white/10 text-[#f1f3f4] ${
                    showTotalSeries ? "bg-cyan-500/15" : "bg-slate-900/60"
                  }`}
                >
                  <td className="px-2 py-2.5">
                    <input
                      type="checkbox"
                      checked={showTotalSeries}
                      onChange={() => setShowTotalSeries((previous) => !previous)}
                      className="h-3.5 w-3.5 rounded border border-[#5f6368] bg-[#202124] accent-[#8ab4f8]"
                    />
                  </td>
                  <td className="px-2 py-2.5 font-semibold">Total</td>
                  <td className="px-2 py-2.5 text-right font-semibold">
                    {formatCurrency(totalRow.revenue)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold">
                    {formatNumber(totalRow.orders)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold">
                    {formatCurrency(totalRow.aov)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold">
                    {formatPercent(totalRow.revenueShare)}
                  </td>
                </tr>
              )}
              {!loading &&
                sortedTableData.map((row) => {
                  const checked = activeSubcategories.includes(row.subcategory);
                  const swatchColor = colorMap[row.subcategory] || LINE_COLORS[0];
                  return (
                    <tr
                      key={row.subcategory}
                      className="cursor-pointer border-b border-[#2f2f2f] transition-colors hover:bg-[#2b2b2b]"
                      onClick={() => handleToggleSubcategory(row.subcategory)}
                      onMouseEnter={() => setHoveredSubcategory(row.subcategory)}
                      onMouseLeave={() => setHoveredSubcategory("")}
                    >
                      <td className="px-2 py-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => handleToggleSubcategory(row.subcategory)}
                          className="h-3.5 w-3.5 rounded border border-[#5f6368] bg-[#202124] accent-[#8ab4f8]"
                        />
                      </td>
                      <td className="px-2 py-2.5 text-[#e6e6e6]">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5"
                            style={{ backgroundColor: swatchColor }}
                            aria-hidden
                          />
                          <span>{row.subcategory}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-semibold text-[#f1f3f4]">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-[#c1c7cd]">
                        {formatNumber(row.orders)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-[#c1c7cd]">
                        {formatCurrency(row.aov)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-[#c1c7cd]">
                        {formatPercent(row.revenueShare)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {!loading && !error && sortedTableData.length === 0 && (
          <p className="py-4 text-sm text-[#9aa0a6]">
            No {breakdownLabel.toLowerCase()} analytics found for the selected date range.
          </p>
        )}
      </div>
    </div>
  );
};

export default CategoryAnalytics;
