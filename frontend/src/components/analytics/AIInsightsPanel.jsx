import { Lightbulb, TrendingDown, TrendingUp } from "lucide-react";

const iconByType = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Lightbulb,
};

const classByType = {
  positive: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  negative: "border-rose-400/25 bg-rose-500/10 text-rose-200",
  neutral: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
};

const AIInsightsPanel = ({ insights = [], loading = false, error = "" }) => {
  const rows = Array.isArray(insights) ? insights : [];

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-md sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 p-1.5 text-cyan-200">
          <Lightbulb size={14} />
        </span>
        <h3 className="text-sm font-semibold text-slate-100">AI Insights</h3>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-lg border border-white/10 bg-slate-900/70"
            />
          ))}
        </div>
      )}

      {!loading && error && <p className="text-sm text-rose-300">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-slate-400">No insights available for the current filters.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((insight) => {
            const tone = insight?.type || "neutral";
            const Icon = iconByType[tone] || Lightbulb;
            return (
              <article
                key={insight?.id || insight?.text}
                className={`rounded-lg border px-3 py-2 text-sm ${classByType[tone] || classByType.neutral}`}
              >
                <div className="flex items-start gap-2">
                  <Icon size={15} className="mt-0.5 shrink-0" />
                  <p>{insight?.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AIInsightsPanel;
