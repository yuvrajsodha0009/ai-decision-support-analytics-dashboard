import { AlertTriangle, BarChart3, Lightbulb, TrendingUp } from "lucide-react";

const PRIORITY_ORDER = ["negative", "positive", "neutral"];

const TONE_META = {
  negative: {
    label: "Risk Alert",
    Icon: AlertTriangle,
    className: "border-rose-400/25 bg-rose-500/10 text-rose-100",
  },
  positive: {
    label: "Growth Insight",
    Icon: TrendingUp,
    className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  },
  neutral: {
    label: "Opportunity Insight",
    Icon: Lightbulb,
    className: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
  },
};

const selectKeyInsight = (insights = []) => {
  if (!Array.isArray(insights) || insights.length === 0) return null;

  for (const tone of PRIORITY_ORDER) {
    const match = insights.find((insight) => insight?.type === tone && insight?.text);
    if (match) return match;
  }

  return insights.find((insight) => insight?.text) || null;
};

const InsightBanner = ({ insights = [], loading = false, error = "" }) => {
  if (loading) {
    return (
      <section className="h-[92px] animate-pulse rounded-2xl border border-white/10 bg-slate-900/60" />
    );
  }

  const selectedInsight = selectKeyInsight(insights);
  const selectedTone = selectedInsight?.type || "neutral";
  const meta = TONE_META[selectedTone] || TONE_META.neutral;
  const ToneIcon = meta.Icon;

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 via-slate-900/35 to-indigo-500/10 p-4 sm:p-5">
      <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
        <span className="rounded-md border border-cyan-400/25 bg-cyan-500/10 p-1.5 text-cyan-200">
          <BarChart3 size={14} />
        </span>
        Key Insight
      </div>

      <div className={`rounded-xl border p-3 ${meta.className}`}>
        <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
          <ToneIcon size={13} />
          {meta.label}
        </div>
        <p className="text-sm leading-5">
          {selectedInsight?.text ||
            (error
              ? "Unable to load insight details for the current filters."
              : "No insight available for the current filter selection.")}
        </p>
      </div>
    </section>
  );
};

export default InsightBanner;
