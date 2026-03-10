import { Lightbulb, ShieldAlert, TrendingUp } from "lucide-react";

const INSIGHT_META = {
  positive: {
    title: "Growth Insight",
    Icon: TrendingUp,
    className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  },
  negative: {
    title: "Risk Alert",
    Icon: ShieldAlert,
    className: "border-rose-400/25 bg-rose-500/10 text-rose-100",
  },
  neutral: {
    title: "Opportunity Insight",
    Icon: Lightbulb,
    className: "border-sky-400/25 bg-sky-500/10 text-sky-100",
  },
};

const InsightCards = ({ insights = [], loading = false, error = "" }) => {
  const rows = Array.isArray(insights) ? insights : [];

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl border border-white/10 bg-slate-900/70"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">No insights available for the current filters.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {rows.map((insight) => {
        const meta = INSIGHT_META[insight?.type] || INSIGHT_META.neutral;
        const Icon = meta.Icon;

        return (
          <article
            key={insight?.id || insight?.text}
            className={`rounded-xl border p-3 ${meta.className}`}
          >
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
              <Icon size={13} />
              {meta.title}
            </div>
            <p className="text-sm leading-5">{insight?.text}</p>
          </article>
        );
      })}
    </div>
  );
};

export default InsightCards;
