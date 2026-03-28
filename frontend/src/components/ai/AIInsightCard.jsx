import { BrainCircuit, LoaderCircle, PinOff, Sparkles } from "lucide-react";

import { useAI } from "../../hooks/useAI";
import DashboardCard from "../dashboard/DashboardCard";
import CopilotResponseBlocks from "./CopilotResponseBlocks";

const AIInsightCard = ({ insightId, intent, data, title, onRemove }) => {
  const { data: response, isLoading, error } = useAI(intent, data);

  return (
    <DashboardCard
      className="h-full p-0"
      gradientClassName="bg-gradient-to-br from-cyan-400/[0.09] via-slate-950/40 to-sky-500/[0.12]"
      hoverable={false}
    >
      <div className="h-full rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.95))] p-5 shadow-[0_28px_70px_rgba(2,6,23,0.3)]">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[20px] border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
              <BrainCircuit size={18} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100">
                  <Sparkles size={11} />
                  Pinned insight
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                  {intent}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-50">{title}</h3>
              <p className="mt-1 text-sm text-slate-400">
                Replayed through the same analytics copilot pipeline as the drawer.
              </p>
            </div>
          </div>

          {typeof onRemove === "function" && (
            <button
              type="button"
              onClick={() => onRemove(insightId)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-400/[0.08] hover:text-cyan-100"
            >
              <PinOff size={13} />
              Unpin
            </button>
          )}
        </div>

        {!data && (
          <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
            Waiting for dashboard context before requesting AI output.
          </div>
        )}

        {data && isLoading && (
          <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-sm text-cyan-100">
              <LoaderCircle size={15} className="animate-spin" />
              Replaying the pinned copilot response...
            </div>
            <div className="h-4 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="h-4 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="h-24 animate-pulse rounded-[20px] bg-white/[0.06]" />
          </div>
        )}

        {data && !isLoading && error && (
          <div className="rounded-[22px] border border-rose-300/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">
            {error}
          </div>
        )}

        {data && !isLoading && !error && (
          <CopilotResponseBlocks payload={response?.payload} variant="pinned" />
        )}
      </div>
    </DashboardCard>
  );
};

export default AIInsightCard;
