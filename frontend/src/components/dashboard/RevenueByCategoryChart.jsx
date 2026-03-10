import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import ChartContainer from "./ChartContainer";

const BAR_BASE_COLOR = "#2dd4bf";
const BAR_HOVER_COLOR = "#5eead4";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const extractCategoryFromChartState = (state) => {
  if (!state) return "";

  if (typeof state.activeLabel === "string" && state.activeLabel.trim()) {
    return state.activeLabel.trim();
  }

  const firstPayload = Array.isArray(state.activePayload)
    ? state.activePayload[0]
    : state.activePayload;

  const payloadCategory = firstPayload?.payload?.category;
  if (typeof payloadCategory === "string" && payloadCategory.trim()) {
    return payloadCategory.trim();
  }

  return "";
};

const RevenueByCategoryChart = ({ data, loading, error }) => {
  const chartRows = Array.isArray(data) ? data : [];
  const navigate = useNavigate();
  const [hoveredCategory, setHoveredCategory] = useState("");
  const [labelHoveredCategory, setLabelHoveredCategory] = useState("");
  const defaultCategory = chartRows[0]?.category;

  const navigateToCategory = (category) => {
    const normalizedCategory =
      typeof category === "string" ? category.trim() : "";
    if (!normalizedCategory) return;
    navigate(`/dashboard/category/${encodeURIComponent(normalizedCategory)}`);
  };

  const handleCategoryClick = (entry, _index, event) => {
    event?.stopPropagation?.();
    const category = entry?.payload?.category || entry?.category;
    navigateToCategory(category);
  };

  const handleChartMouseMove = (state) => {
    const activeCategory = extractCategoryFromChartState(state);
    if (activeCategory) {
      setHoveredCategory(activeCategory);
      return;
    }

    if (!labelHoveredCategory) {
      setHoveredCategory("");
    }
  };

  const handleChartMouseLeave = () => {
    if (!labelHoveredCategory) {
      setHoveredCategory("");
    }
  };

  const handleChartClick = (state) => {
    const activeCategory =
      extractCategoryFromChartState(state) ||
      labelHoveredCategory ||
      hoveredCategory;
    navigateToCategory(activeCategory);
  };

  const handleHeaderIconClick = (event) => {
    event?.stopPropagation?.();
    navigateToCategory(labelHoveredCategory || hoveredCategory || defaultCategory);
  };

  const titleAction = (
    <button
      type="button"
      onClick={handleHeaderIconClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-500/35 bg-slate-900/70 text-cyan-200 transition-colors hover:border-cyan-300/60 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
      aria-label="Open category analytics"
      title="Open category analytics"
      disabled={!defaultCategory}
    >
      <ArrowUpRight size={13} />
    </button>
  );

  const renderCategoryTick = ({ x, y, payload }) => {
    const category = payload?.value;
    const activeCategory = labelHoveredCategory || hoveredCategory;
    const isActive = category === activeCategory;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill={isActive ? BAR_HOVER_COLOR : "#cbd5e1"}
          fontSize={12}
          style={{ cursor: "pointer", userSelect: "none" }}
          onMouseEnter={() => setLabelHoveredCategory(category || "")}
          onMouseLeave={() => setLabelHoveredCategory("")}
          onClick={() => navigateToCategory(category)}
        >
          {category}
        </text>
      </g>
    );
  };

  return (
    <ChartContainer
      title="Revenue by Category"
      subtitle="Top categories by total revenue contribution"
      actions={titleAction}
      loading={loading}
      error={error}
      contentClassName="h-80"
      gradientClassName="bg-gradient-to-br from-cyan-500/12 via-slate-900/10 to-emerald-500/16"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartRows}
          margin={{ top: 10, right: 20, left: 34, bottom: 4 }}
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
          onClick={handleChartClick}
        >
          <CartesianGrid vertical={false} stroke="#334155" strokeOpacity={0.25} />
          <XAxis
            dataKey="category"
            stroke="#94a3b8"
            tick={renderCategoryTick}
            interval={0}
            padding={{ left: 36, right: 10 }}
            axisLine={{ stroke: "#334155" }}
            tickLine={{ stroke: "#334155" }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: "#cbd5e1", fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value)}
            tickMargin={8}
            width={120}
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
          <Bar
            dataKey="totalRevenue"
            fill={BAR_BASE_COLOR}
            radius={[8, 8, 0, 0]}
            cursor="pointer"
            onClick={handleCategoryClick}
          >
            {chartRows.map((entry, index) => {
              const category = entry?.category;
              const activeCategory = labelHoveredCategory || hoveredCategory;
              const fill =
                category && category === activeCategory
                  ? BAR_HOVER_COLOR
                  : BAR_BASE_COLOR;

              return (
                <Cell
                  key={`category-cell-${category || index}`}
                  fill={fill}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default RevenueByCategoryChart;
