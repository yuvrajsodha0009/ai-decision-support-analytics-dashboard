import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock3,
  Database,
  Filter,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { memo, useMemo } from "react";

import {
  buildContextOverview,
  formatLabel,
  getContextMeta,
} from "./copilotDrawerMeta";

export const ContextStrip = memo(function ContextStrip({
  context,
  expanded,
  onToggle,
}) {
  const overview = useMemo(() => buildContextOverview(context), [context]);

  return (
    <section className="ai-copilot-context-strip">
      <button
        type="button"
        onClick={onToggle}
        className="ai-copilot-context-toggle"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="ai-copilot-chip ai-copilot-chip-primary">
            <Database size={13} />
            {overview.hasContext ? "Live dashboard context" : "Limited context"}
          </span>
          <span className="ai-copilot-chip">{context.label}</span>
          <span className="ai-copilot-chip">
            Anchor: {formatLabel(context.activeContext || "dashboard")}
          </span>
          {context.compareMode && (
            <span className="ai-copilot-chip ai-copilot-chip-soft">Compare mode</span>
          )}
          {overview.filterCount > 0 && (
            <span className="ai-copilot-chip ai-copilot-chip-soft">
              {overview.filterCount} filter{overview.filterCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/75">
              Active context snapshot
            </p>
            <div className="flex flex-wrap gap-2">
              {overview.chips.map((chip) => (
                <span key={`${chip.label}-${chip.value}`} className="ai-copilot-chip">
                  <span className="text-slate-500">{chip.label}:</span>
                  <span className="text-slate-100">{chip.value}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/75">
              Active filters
            </p>
            {overview.filters.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {overview.filters.map((entry) => (
                  <span key={`${entry.label}-${entry.value}`} className="ai-copilot-chip">
                    <span className="text-slate-500">{entry.label}:</span>
                    <span className="text-slate-100">{entry.value}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No additional filters are narrowing this Ask AI context.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
});

export const EmptyState = memo(function EmptyState({
  context,
  onPickSuggestion,
}) {
  const meta = getContextMeta(context.activeContext);
  const overview = useMemo(() => buildContextOverview(context), [context]);

  return (
    <div className="space-y-4">
      {!overview.hasContext && (
        <section className="ai-copilot-card ai-copilot-warning-card">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-200">
              <Filter size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-100">Context is still warming up</p>
              <p className="mt-1 text-sm leading-6 text-amber-100/80">
                The copilot answers best when chart data and summary metrics are loaded. You can
                still ask a question, but the answer may stay conservative until more context is
                available.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="ai-copilot-card ai-copilot-hero-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="ai-copilot-chip ai-copilot-chip-primary">
            <Sparkles size={13} />
            Ready for analysis
          </span>
          <span className="ai-copilot-chip">{meta.label}</span>
        </div>

        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
            Analytics workspace
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Ask sharper questions. Get grounded answers.
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            {meta.subtitle}
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {meta.capabilities.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
                <Icon size={17} />
              </span>
              <h4 className="mt-4 text-sm font-semibold text-slate-100">{title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ai-copilot-card ai-copilot-section-card">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={15} className="text-cyan-200" />
          <h4 className="text-sm font-semibold text-slate-100">Suggestion chips</h4>
        </div>

        <div className="flex flex-wrap gap-2">
          {meta.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onPickSuggestion(suggestion)}
              className="ai-copilot-chip-button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {meta.popularGroups.map((group) => (
          <section key={group.label} className="ai-copilot-card ai-copilot-section-card">
            <div className="mb-3 flex items-center gap-2">
              <ArrowRight size={14} className="text-cyan-200" />
              <h4 className="text-sm font-semibold text-slate-100">{group.label}</h4>
            </div>

            <div className="space-y-2">
              {group.questions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => onPickSuggestion(question)}
                  className="ai-copilot-question-button"
                >
                  {question}
                </button>
              ))}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
});

export const TypingIndicator = memo(function TypingIndicator({ stepText }) {
  return (
    <section className="ai-copilot-card ai-copilot-section-card max-w-[96%]">
      <div className="mb-3 flex items-center gap-2 text-sm text-cyan-100">
        <LoaderCircle size={15} className="animate-spin" />
        {stepText || "AI analyzing data..."}
      </div>
      <div className="flex items-center gap-1">
        <span className="ai-copilot-dot" />
        <span className="ai-copilot-dot ai-copilot-dot-delay-1" />
        <span className="ai-copilot-dot ai-copilot-dot-delay-2" />
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Clock3 size={12} />
        Staying grounded in the active dashboard context.
      </p>
    </section>
  );
});
