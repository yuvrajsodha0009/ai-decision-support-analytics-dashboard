import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import {
  formatCurrency,
  formatDelta,
  formatNumber,
  formatPercent,
} from "../../utils/analyticsFormatters";

const CardSkeleton = () => (
  <div className="h-28 animate-pulse rounded-xl border border-white/10 bg-slate-900/70" />
);

const TrendPill = ({ delta }) => {
  const value = Number(delta || 0);
  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  const toneClassName = positive
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-300"
    : negative
      ? "border-rose-400/35 bg-rose-500/10 text-rose-300"
      : "border-slate-400/25 bg-slate-500/10 text-slate-300";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${toneClassName}`}>
      <Icon size={12} />
      {formatDelta(value)}
    </span>
  );
};

const KPIItem = ({ title, value, delta, valueClassName = "" }) => (
  <article className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
    <p className="text-[11px] uppercase tracking-wide text-slate-400">{title}</p>
    <p className={`mt-1 text-lg font-semibold text-slate-50 ${valueClassName}`}>{value}</p>
    <div className="mt-3 flex items-center gap-2">
      <TrendPill delta={delta} />
    </div>
    <p className="mt-1 text-[10px] text-slate-400">vs previous period</p>
  </article>
);

const RegionKPICards = ({ summary, loading = false, error = "" }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="mb-4 text-sm text-rose-300">{error}</p>;
  }

  const comparisons = summary?.comparisons || {};
  const cards = [
    {
      key: "revenue",
      title: "Total Revenue",
      value: formatCurrency(summary?.revenue),
      delta: comparisons.revenue,
    },
    {
      key: "orders",
      title: "Total Orders",
      value: formatNumber(summary?.orders),
      delta: comparisons.orders,
    },
    {
      key: "aov",
      title: "Average Order Value",
      value: formatCurrency(summary?.aov),
      delta: comparisons.aov,
    },
    {
      key: "customers",
      title: "Total Customers",
      value: formatNumber(summary?.customers),
      delta: comparisons.customers,
    },
    {
      key: "growth",
      title: "Revenue Growth %",
      value: formatPercent(summary?.growth, 1),
      delta: summary?.growth,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <KPIItem
          key={card.key}
          title={card.title}
          value={card.value}
          delta={card.delta}
          valueClassName={card.valueClassName}
        />
      ))}
    </div>
  );
};

export default RegionKPICards;
