import { AlertTriangle, Lightbulb, ShieldAlert, TrendingUp } from "lucide-react";
import DashboardCard from "./DashboardCard";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value || 0);

const DecisionInsights = ({ insights, loading, error }) => {
  const cards = [
    {
      key: "growth",
      title: "Growth Opportunity",
      description:
        insights.growthDescription ||
        (insights.bestCategory
          ? `${insights.bestCategory} is leading with revenue of ${formatNumber(
              insights.bestCategoryRevenue
            )}.`
          : "No category growth signal available for the selected range."),
      icon: TrendingUp,
      tone: "border-emerald-400/70 bg-emerald-500/10",
      iconColor: "text-emerald-300",
    },
    {
      key: "risk",
      title: "Risk Alert",
      description:
        insights.riskDescription ||
        (insights.needsAttentionCategory
          ? `${insights.needsAttentionCategory} is trailing at ${Number(
              insights.needsAttentionGrowth || 0
            ).toFixed(2)}% growth.`
          : "No declining category identified."),
      icon: ShieldAlert,
      tone: "border-rose-400/70 bg-rose-500/10",
      iconColor: "text-rose-300",
    },
    {
      key: "recommendation",
      title: "Recommendation",
      description:
        insights.recommendation || "Keep monitoring trend changes for new opportunities.",
      icon: Lightbulb,
      tone: "border-sky-400/70 bg-sky-500/10",
      iconColor: "text-sky-300",
    },
    {
      key: "warning",
      title: "Warning",
      description:
        insights.warningDescription ||
        (Number(insights.needsAttentionGrowth || 0) < -10
          ? "Sustained decline detected. Prioritize pricing/promo experiments this week."
          : "No severe warning threshold breached in this cycle."),
      icon: AlertTriangle,
      tone: "border-amber-400/70 bg-amber-500/10",
      iconColor: "text-amber-300",
    },
  ];

  return (
    <DashboardCard
      className="p-6"
      gradientClassName="bg-gradient-to-br from-cyan-500/10 via-slate-900/8 to-indigo-500/14"
      hoverable={false}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-100">Decision Support Insights</h3>
        <span className="rounded-lg border border-white/10 bg-slate-800/70 px-2.5 py-1 text-xs text-slate-300">
          AI-Augmented
        </span>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-white/10 bg-slate-800/70"
            />
          ))}
        </div>
      )}

      {!loading && error && <p className="text-sm text-rose-300">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.key}
              className={`rounded-2xl border-l-4 border-white/20 p-4 ${card.tone}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <card.icon size={16} className={card.iconColor} />
                <h4 className="text-sm font-semibold text-slate-100">{card.title}</h4>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">{card.description}</p>
            </article>
          ))}
        </div>
      )}
    </DashboardCard>
  );
};

export default DecisionInsights;
