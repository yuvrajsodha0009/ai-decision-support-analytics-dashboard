import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import ChartContainer from "./ChartContainer";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const COLORS = [
  "#22d3ee",
  "#38bdf8",
  "#14b8a6",
  "#818cf8",
  "#60a5fa",
  "#2dd4bf",
  "#7dd3fc",
];

const RevenueByRegionChart = ({ data, loading, error }) => {
  const navigate = useNavigate();
  const hasRows = Array.isArray(data) && data.length > 0;

  const titleAction = (
    <button
      type="button"
      onClick={() => navigate("/dashboard/map")}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-500/35 bg-slate-900/70 text-cyan-200 transition-colors hover:border-cyan-300/60 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
      aria-label="Open map analytics"
      title="Open map analytics"
      disabled={!hasRows}
    >
      <ArrowUpRight size={13} />
    </button>
  );

  return (
    <ChartContainer
      title="Revenue by Region"
      subtitle="Horizontal ranking for regional sales share"
      actions={titleAction}
      loading={loading}
      error={error}
      contentClassName="h-80"
      gradientClassName="bg-gradient-to-br from-indigo-500/16 via-slate-900/8 to-cyan-500/16"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 16, left: 24, bottom: 4 }}
          barCategoryGap={12}
        >
          <CartesianGrid horizontal={true} vertical={false} stroke="#334155" strokeOpacity={0.25} />
          <XAxis
            type="number"
            stroke="#94a3b8"
            tick={{ fill: "#cbd5e1", fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value)}
            axisLine={{ stroke: "#334155" }}
            tickLine={{ stroke: "#334155" }}
          />
          <YAxis
            type="category"
            dataKey="region"
            width={90}
            stroke="#94a3b8"
            tick={{ fill: "#cbd5e1", fontSize: 12 }}
            axisLine={{ stroke: "#334155" }}
            tickLine={{ stroke: "#334155" }}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            contentStyle={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "12px",
            }}
          />
          <Bar dataKey="totalRevenue" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.region} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default RevenueByRegionChart;
