import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMetricValue } from "../../utils/analyticsFormatters";
import ChartContainer from "../dashboard/ChartContainer";

const COLORS = [
  "#22d3ee",
  "#38bdf8",
  "#14b8a6",
  "#818cf8",
  "#60a5fa",
  "#2dd4bf",
  "#7dd3fc",
  "#a78bfa",
];

const RegionBarChart = ({ data = [], metric = "revenue", loading = false, error = "" }) => {
  return (
    <ChartContainer
      title="Region Bar Chart"
      subtitle="Top regions by selected metric"
      loading={loading}
      error={error}
      contentClassName="h-[320px]"
      gradientClassName="bg-gradient-to-br from-sky-500/18 via-slate-900/8 to-cyan-500/16"
      className="p-4 sm:p-5"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 16, left: 24, bottom: 4 }}
          barCategoryGap={10}
        >
          <CartesianGrid horizontal={true} vertical={false} stroke="#334155" strokeOpacity={0.16} />
          <XAxis
            type="number"
            stroke="#94a3b8"
            tick={{ fill: "#cbd5e1", fontSize: 11 }}
            tickFormatter={(value) => formatMetricValue(metric, value)}
            axisLine={{ stroke: "#334155" }}
            tickLine={{ stroke: "#334155" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            stroke="#94a3b8"
            tick={{ fill: "#cbd5e1", fontSize: 11 }}
            axisLine={{ stroke: "#334155" }}
            tickLine={{ stroke: "#334155" }}
          />
          <Tooltip
            formatter={(value) => formatMetricValue(metric, value)}
            contentStyle={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "12px",
            }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default RegionBarChart;
