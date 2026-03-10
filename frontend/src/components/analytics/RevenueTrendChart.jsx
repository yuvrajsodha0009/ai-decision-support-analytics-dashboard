import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatNumber } from "../../utils/analyticsFormatters";
import ChartContainer from "../dashboard/ChartContainer";

const formatDateTick = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-IN", {
    month: "short",
    day: "2-digit",
  });
};

const toNumericValue = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toSortedRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      ...row,
      __periodMs: new Date(row?.period).getTime(),
    }))
    .filter((row) => Number.isFinite(row.__periodMs))
    .sort((left, right) => left.__periodMs - right.__periodMs);

const buildComparisonSeries = (currentRows = [], previousRows = []) => {
  const current = toSortedRows(currentRows);
  const previous = toSortedRows(previousRows);
  const points = Math.max(current.length, previous.length);

  return Array.from({ length: points }, (_, index) => {
    const currentPoint = current[index];
    const previousPoint = previous[index];
    return {
      period: currentPoint?.period || previousPoint?.period || `slot-${index}`,
      currentRevenue: toNumericValue(currentPoint?.revenue),
      previousRevenue: previousPoint ? toNumericValue(previousPoint?.revenue) : null,
    };
  });
};

const RevenueTrendChart = ({
  data = [],
  previousData = [],
  loading = false,
  error = "",
}) => {
  const chartData = buildComparisonSeries(data, previousData);

  return (
    <ChartContainer
      title="Revenue Trend"
      subtitle="Revenue trend across selected timeline"
      loading={loading}
      error={error}
      contentClassName="h-[320px]"
      gradientClassName="bg-gradient-to-br from-cyan-500/18 via-slate-900/8 to-indigo-500/16"
      className="p-4 sm:p-5"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="#334155" strokeOpacity={0.2} />
          <XAxis
            dataKey="period"
            stroke="#94a3b8"
            tick={{ fill: "#cbd5e1", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatDateTick}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: "#cbd5e1", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCurrency(value)}
            width={114}
          />
          <Tooltip
            formatter={(value, key) => {
              if (key === "currentRevenue") return [formatCurrency(value), "Current Period"];
              if (key === "previousRevenue") return [formatCurrency(value), "Previous Period"];
              return formatNumber(value);
            }}
            labelFormatter={formatDateTick}
            contentStyle={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "12px",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 6 }} />
          <Line
            type="monotone"
            dataKey="currentRevenue"
            name="Current Period"
            stroke="#22d3ee"
            strokeWidth={2.4}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="previousRevenue"
            name="Previous Period"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            strokeDasharray="6 4"
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default RevenueTrendChart;
