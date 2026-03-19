import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  Legend,
} from "recharts";
import { useAnalyticsFilters } from "../../context/AnalyticsFiltersContext";
import ChartContainer from "./ChartContainer";

const MAX_DENSE_POINTS = 1600;

const formatDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
};

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

const formatCurrencyThousands = (value) => {
  const numeric = Number(value || 0);
  return `\u20b9${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(numeric / 1000)}k`;
};

const toChartNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getTimeParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const take = (type) =>
    parts.find((part) => part.type === type)?.value || "00";

  return {
    year: take("year"),
    month: take("month"),
    day: take("day"),
    hour: take("hour"),
  };
};

const getIsoWeekKey = ({ year, month, day }) => {
  const utcDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  const dayOfWeek = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - dayOfWeek + 3);

  const weekYear = utcDate.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  const firstDayOfWeek = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayOfWeek + 3);

  const weekNumber = 1 + Math.round((utcDate - firstThursday) / 604800000);
  return `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
};

const getBucketKey = (date, groupBy, timeZone) => {
  const parts = getTimeParts(date, timeZone);

  if (groupBy === "hour") {
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}`;
  }

  if (groupBy === "month") {
    return `${parts.year}-${parts.month}`;
  }

  if (groupBy === "week") {
    return getIsoWeekKey(parts);
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const advanceCursorByGroup = (cursor, groupBy) => {
  if (groupBy === "hour") {
    cursor.setUTCHours(cursor.getUTCHours() + 1);
    return;
  }

  if (groupBy === "week") {
    cursor.setUTCDate(cursor.getUTCDate() + 7);
    return;
  }

  if (groupBy === "month") {
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    return;
  }

  cursor.setUTCDate(cursor.getUTCDate() + 1);
};

const buildDenseChartSeries = ({
  rows,
  groupBy,
  timeZone,
  startIso,
  endIso,
  compareMode,
  metric,
}) => {
  const parsedRows = rows
    .map((row) => {
      const periodDate = new Date(row.period);
      if (Number.isNaN(periodDate.getTime())) return null;
      return {
        period: periodDate.toISOString(),
        currentValue: toChartNumber(row[metric.currentKey]),
        previousValue: compareMode
          ? toChartNumber(row[metric.previousKey])
          : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.period) - new Date(b.period));

  if (!parsedRows.length) return [];

  const start = new Date(startIso);
  const end = new Date(endIso);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return parsedRows;
  }

  const mapByBucket = new Map(
    parsedRows.map((row) => [
      getBucketKey(new Date(row.period), groupBy, timeZone),
      row,
    ]),
  );

  const dense = [];
  const cursor = new Date(start);
  let matched = 0;
  let guard = 0;

  while (cursor <= end && guard < MAX_DENSE_POINTS) {
    const bucketKey = getBucketKey(cursor, groupBy, timeZone);
    const existing = mapByBucket.get(bucketKey);

    if (existing) {
      matched += 1;
      dense.push(existing);
    } else {
      dense.push({
        period: cursor.toISOString(),
        currentValue: 0,
        previousValue: compareMode ? 0 : null,
      });
    }

    advanceCursorByGroup(cursor, groupBy);
    guard += 1;
  }

  if (matched === 0) return parsedRows;

  return dense;
};

const TrendTooltip = ({ active, payload, label, metric, compareMode }) => {
  if (!active || !payload?.length) return null;

  let currentValue = null;
  let previousValue = null;

  payload.forEach((item) => {
    if (item.dataKey === "currentValue" && currentValue === null) {
      currentValue = toNullableNumber(item.value);
    }
    if (item.dataKey === "previousValue" && previousValue === null) {
      previousValue = toNullableNumber(item.value);
    }
  });

  return (
    <div className="rounded-xl border border-slate-500/35 bg-slate-900/85 px-4 py-3 shadow-xl backdrop-blur-md">
      <p className="mb-2 text-sm font-semibold text-slate-100">
        {formatDateLabel(label)}
      </p>
      {currentValue !== null && (
        <p className="text-sm text-cyan-200">
          Current {metric.label}:{" "}
          <span className="font-semibold">
            {metric.formatValue(currentValue)}
          </span>
        </p>
      )}
      {compareMode && previousValue !== null && (
        <p className="mt-1 text-sm text-orange-200">
          Previous {metric.label}:{" "}
          <span className="font-semibold">
            {metric.formatValue(previousValue)}
          </span>
        </p>
      )}
    </div>
  );
};

const metricConfig = {
  revenue: {
    label: "Revenue",
    title: "Revenue Over Time",
    subtitle:
      "Track revenue movement across the selected period with optional previous-period comparison",
    currentKey: "currentRevenue",
    previousKey: "previousRevenue",
    formatValue: formatCurrency,
    axisColor: "#22d3ee",
    areaGradient: ["#22d3ee", "rgba(34, 211, 238, 0.05)"],
  },
  orders: {
    label: "Orders",
    title: "Orders Over Time",
    subtitle:
      "Track order momentum across the selected period with optional previous-period comparison",
    currentKey: "currentOrders",
    previousKey: "previousOrders",
    formatValue: formatNumber,
    axisColor: "#38bdf8",
    areaGradient: ["#38bdf8", "rgba(56, 189, 248, 0.05)"],
  },
  aov: {
    label: "AOV",
    title: "Average Order Value Over Time",
    subtitle:
      "Track average order value across the selected period with optional previous-period comparison",
    currentKey: "currentAov",
    previousKey: "previousAov",
    formatValue: formatCurrency,
    axisColor: "#818cf8",
    areaGradient: ["#818cf8", "rgba(129, 140, 248, 0.05)"],
  },
};

const RevenueTrendChart = ({
  data,
  compareMode,
  loading,
  error,
  activeMetric = "revenue",
  onMetricChange = () => {},
  insightPanel = null,
}) => {
  const { filters, setFilter } = useAnalyticsFilters();

  const metric = metricConfig[activeMetric] || metricConfig.revenue;

  const chartData = useMemo(
    () =>
      buildDenseChartSeries({
        rows: data,
        groupBy: filters.groupBy || "day",
        timeZone: filters.timezone || "UTC",
        startIso: filters.start,
        endIso: filters.end,
        compareMode,
        metric,
      }),
    [
      data,
      filters.groupBy,
      filters.timezone,
      filters.start,
      filters.end,
      compareMode,
      metric,
    ],
  );

  const areaGradientId = `trendAreaGradient-${activeMetric}`;

  const actions = (
    <>
      <div className="flex rounded-xl border border-white/10 bg-slate-900/70 p-1">
        {Object.entries(metricConfig).map(([key, config]) => (
          <button
            key={key}
            type="button"
            onClick={() => onMetricChange(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-in-out ${
              activeMetric === key
                ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-300/70"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setFilter("compareMode", !compareMode)}
        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 ease-in-out ${
          compareMode
            ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-200"
            : "border-white/10 bg-slate-800/70 text-slate-200 hover:bg-slate-700/70"
        }`}
      >
        {compareMode
          ? "Comparing Previous Period"
          : "Compare with Previous Period"}
      </button>
    </>
  );

  return (
    <ChartContainer
      title={metric.title}
      subtitle={metric.subtitle}
      actions={actions}
      loading={loading}
      error={error}
      gradientClassName="bg-gradient-to-br from-cyan-500/20 via-slate-900/15 to-indigo-500/20"
    >
      <div className="space-y-4">
        <div className="h-[400px] w-full overflow-x-auto overflow-y-hidden pb-1 md:overflow-hidden">
          <div className="h-full min-w-[760px] md:min-w-0">
            <ResponsiveContainer width="100%" height="100%" debounce={150}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 18, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient
                    id={areaGradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={metric.areaGradient[0]}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={metric.areaGradient[1]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  vertical={false}
                  stroke="#475569"
                  strokeOpacity={0.16}
                />
                <XAxis
                  dataKey="period"
                  tickFormatter={formatDateLabel}
                  stroke="#94a3b8"
                  tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={18}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  tickFormatter={(value) =>
                    activeMetric === "revenue" || activeMetric === "aov"
                      ? formatCurrencyThousands(value)
                      : formatNumber(value)
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{
                    stroke: "rgba(148, 163, 184, 0.35)",
                    strokeWidth: 1,
                  }}
                  content={
                    <TrendTooltip metric={metric} compareMode={compareMode} />
                  }
                />
                <Legend wrapperStyle={{ paddingTop: 8 }} />

                <Area
                  type="monotone"
                  dataKey="currentValue"
                  fill={`url(#${areaGradientId})`}
                  stroke="none"
                  legendType="none"
                  isAnimationActive
                />
                <Line
                  type="monotone"
                  dataKey="currentValue"
                  name={`Current ${metric.label}`}
                  stroke={metric.axisColor}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: metric.axisColor }}
                />
                {compareMode && (
                  <Line
                    type="monotone"
                    dataKey="previousValue"
                    name={`Previous ${metric.label}`}
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="6 4"
                    activeDot={{ r: 3, strokeWidth: 0, fill: "#f97316" }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {insightPanel && (
          <div className="border-t border-white/10 pt-4">{insightPanel}</div>
        )}
      </div>
    </ChartContainer>
  );
};

export default RevenueTrendChart;
