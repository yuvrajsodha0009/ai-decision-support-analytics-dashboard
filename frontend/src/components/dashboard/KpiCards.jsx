import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import {
  Calculator,
  IndianRupee,
  Percent,
  Repeat2,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import DashboardCard from "./DashboardCard";

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

const resolveSummaryField = (summary, keys = [], fallback = 0) => {
  for (const key of keys) {
    if (summary?.[key] !== undefined && summary?.[key] !== null) {
      return Number(summary[key]) || 0;
    }
  }
  return fallback;
};

const useAnimatedNumber = (value, duration = 900) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let animationFrame = 0;
    const target = Number(value || 0);
    const start = performance.now();

    const run = (timestamp) => {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - (1 - progress) ** 3;
      setAnimatedValue(target * easeOut);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(run);
      }
    };

    animationFrame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return animatedValue;
};

const GrowthBadge = ({ value, show }) => {
  const numericValue = Number(value);
  if (!show || !Number.isFinite(numericValue)) return null;

  const positive = numericValue >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
        positive
          ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-300"
          : "border-rose-300/30 bg-rose-500/10 text-rose-300"
      }`}
    >
      <Icon size={14} />
      {Math.abs(numericValue).toFixed(2)}%
    </span>
  );
};

const Sparkline = ({ data, dataKey, stroke }) => (
  <div className="h-11 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const KpiSkeleton = () => (
  <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-5">
    {Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        className="h-[190px] animate-pulse rounded-2xl border border-white/10 bg-slate-800/65"
      />
    ))}
  </div>
);

const KpiItem = ({ metric, trendData, showGrowth }) => {
  const animatedValue = useAnimatedNumber(metric.value);

  return (
    <DashboardCard
      className="p-6"
      gradientClassName={metric.gradientClassName}
      hoverable
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="rounded-xl border border-white/10 bg-slate-800/75 p-2 text-cyan-300">
          <metric.icon size={16} />
        </div>
        <GrowthBadge value={metric.growth} show={showGrowth} />
      </div>
      <p className="text-xs uppercase tracking-wider text-slate-400">{metric.label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-50">
        {metric.format(animatedValue)}
      </p>
      <p className="mt-1 text-xs text-slate-400">{metric.subtitle}</p>
      <div className="mt-3">
        <Sparkline data={trendData} dataKey={metric.sparklineKey} stroke={metric.sparkline} />
      </div>
    </DashboardCard>
  );
};

const KpiCards = ({ summary, trendData, loading, error, compareMode = false }) => {
  if (loading) {
    return <KpiSkeleton />;
  }

  if (error) {
    return <p className="mb-6 text-sm text-rose-300">{error}</p>;
  }

  const aov = (summary?.totalRevenue || 0) / Math.max(summary?.totalOrders || 1, 1);

  const revenueGrowth = compareMode
    ? resolveSummaryField(summary, ["revenueGrowthPercentage"], null)
    : null;
  const ordersGrowth = compareMode
    ? resolveSummaryField(summary, ["orderGrowthPercentage"], null)
    : null;
  const conversionGrowth = compareMode
    ? resolveSummaryField(summary, ["conversionGrowthPercentage"], null)
    : null;
  const returningGrowth = compareMode
    ? resolveSummaryField(summary, ["returningCustomersGrowthPercentage"], null)
    : null;

  const revenueFactor = Number.isFinite(Number(revenueGrowth))
    ? 1 + Number(revenueGrowth) / 100
    : null;
  const orderFactor = Number.isFinite(Number(ordersGrowth))
    ? 1 + Number(ordersGrowth) / 100
    : null;
  const aovGrowthPercentage =
    compareMode && revenueFactor !== null && orderFactor && orderFactor !== 0
      ? ((revenueFactor / orderFactor) - 1) * 100
      : null;

  const conversionRate = resolveSummaryField(
    summary,
    ["conversionRatePercentage", "conversionRate"],
    0
  );

  const returningCustomersPercentage = resolveSummaryField(summary, [
    "returningCustomersPercentage",
    "returningCustomerPercentage",
    "returningCustomerRate",
    "returningRatePercentage",
  ]);

  const metrics = [
    {
      id: "revenue",
      label: "Revenue",
      value: summary?.totalRevenue || 0,
      growth: revenueGrowth,
      format: formatCurrency,
      sparklineKey: "totalRevenue",
      icon: IndianRupee,
      subtitle: "Total booked revenue",
      sparkline: "#22d3ee",
      gradientClassName: "bg-gradient-to-br from-cyan-500/25 via-transparent to-indigo-500/20",
    },
    {
      id: "orders",
      label: "Orders",
      value: summary?.totalOrders || 0,
      growth: ordersGrowth,
      format: formatNumber,
      sparklineKey: "totalOrders",
      icon: ShoppingBag,
      subtitle: "Completed orders",
      sparkline: "#38bdf8",
      gradientClassName: "bg-gradient-to-br from-sky-500/25 via-transparent to-blue-500/20",
    },
    {
      id: "aov",
      label: "Average Order Value",
      value: aov,
      growth:
        aovGrowthPercentage === null ? null : Number(aovGrowthPercentage.toFixed(2)),
      format: formatCurrency,
      sparklineKey: "currentAov",
      icon: Calculator,
      subtitle: "Revenue per order",
      sparkline: "#818cf8",
      gradientClassName: "bg-gradient-to-br from-indigo-500/30 via-transparent to-cyan-500/15",
    },
    {
      id: "conversion",
      label: "Conversion Rate",
      value: conversionRate,
      growth: conversionGrowth,
      format: formatPercent,
      sparklineKey: "totalOrders",
      icon: Percent,
      subtitle: "Completed orders / visitors",
      sparkline: "#14b8a6",
      gradientClassName: "bg-gradient-to-br from-teal-500/25 via-transparent to-emerald-500/20",
    },
    {
      id: "returning",
      label: "Returning Customers",
      value: returningCustomersPercentage,
      growth: returningGrowth,
      format: formatPercent,
      sparklineKey: "totalRevenue",
      icon: Repeat2,
      subtitle: "Returning orders share",
      sparkline: "#a78bfa",
      gradientClassName: "bg-gradient-to-br from-violet-500/25 via-transparent to-indigo-500/15",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-5">
      {metrics.map((metric) => (
        <KpiItem
          key={metric.id}
          metric={metric}
          trendData={trendData}
          showGrowth={compareMode}
        />
      ))}
    </div>
  );
};

export default KpiCards;
