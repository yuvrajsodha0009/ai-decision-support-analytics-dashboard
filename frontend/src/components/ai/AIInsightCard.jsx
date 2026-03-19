import { BrainCircuit } from "lucide-react";

import { useAI } from "../../hooks/useAI";
import DashboardCard from "../dashboard/DashboardCard";

const renderPayload = (payload) => {
  if (!payload) return null;

  return (
    <div className="space-y-4">
      {payload.text && <p className="text-sm leading-6 text-slate-300">{payload.text}</p>}

      {Array.isArray(payload.items) && payload.items.length > 0 && (
        <div className="space-y-2">
          {payload.items.map((item) => (
            <article
              key={item.id || item.title || item.period}
              className="rounded-xl border border-white/10 bg-slate-900/60 p-3"
            >
              <p className="text-sm font-semibold text-slate-100">
                {item.title || item.label || item.period || "Insight"}
              </p>
              <p className="mt-1 text-sm text-slate-400">{item.detail || item.reason}</p>
            </article>
          ))}
        </div>
      )}

      {Array.isArray(payload.series) && payload.series.length > 0 && (
        <div className="space-y-2">
          {payload.series.map((point) => (
            <div
              key={point.period}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2"
            >
              <span className="text-sm text-slate-300">{point.period}</span>
              <span className="text-sm font-semibold text-cyan-200">
                {Number(point.value || 0).toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AIInsightCard = ({ intent, data, title }) => {
  const { data: response, isLoading, error } = useAI(intent, data);

  return (
    <DashboardCard
      className="h-full p-5"
      gradientClassName="bg-gradient-to-br from-sky-500/12 via-slate-900/8 to-cyan-500/16"
      hoverable={false}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-sky-400/25 bg-sky-400/10 p-2 text-sky-200">
            <BrainCircuit size={16} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{intent}</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-300">
          Gateway
        </span>
      </div>

      {!data && (
        <p className="text-sm text-slate-400">
          Waiting for dashboard context before requesting AI output.
        </p>
      )}

      {data && isLoading && (
        <div className="space-y-3">
          <div className="h-4 animate-pulse rounded bg-slate-800/80" />
          <div className="h-4 animate-pulse rounded bg-slate-800/70" />
          <div className="h-16 animate-pulse rounded-xl bg-slate-800/60" />
        </div>
      )}

      {data && !isLoading && error && <p className="text-sm text-rose-300">{error}</p>}

      {data && !isLoading && !error && renderPayload(response?.payload)}
    </DashboardCard>
  );
};

export default AIInsightCard;
