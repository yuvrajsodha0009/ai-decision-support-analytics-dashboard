import {
  BarChart3,
  Bot,
  LoaderCircle,
  Pin,
  Send,
  Sparkles,
  Table2,
  X,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { useAI } from "../../hooks/useAI";

const CONTEXT_META = {
  revenue_chart: {
    label: "Revenue chart",
    accent: "text-cyan-200",
    suggestions: [
      "Why did revenue spike yesterday?",
      "What changed in the revenue trend this week?",
      "Summarize revenue momentum for leadership.",
    ],
  },
  orders_chart: {
    label: "Orders chart",
    accent: "text-emerald-200",
    suggestions: [
      "Which period drove the most orders?",
      "Show conversion trend for mobile users.",
      "What should I inspect in the orders trend next?",
    ],
  },
  category_chart: {
    label: "Category chart",
    accent: "text-violet-200",
    suggestions: [
      "Which category drives most orders?",
      "Which category needs attention right now?",
      "Compare category leaders and laggards.",
    ],
  },
};

const createMessageId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createRequestId = () =>
  `nlq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const trimQuestion = (question) => {
  if (!question) return "Pinned AI insight";
  return question.length > 64 ? `${question.slice(0, 61)}...` : question;
};

const normalizeDrawerContext = (context = {}) => {
  const activeContext = context.activeContext || "revenue_chart";

  return {
    activeContext,
    label: CONTEXT_META[activeContext]?.label || "Dashboard context",
    filters: context.filters || {},
    data: Array.isArray(context.data) ? context.data : [],
    summary: context.summary || {},
    topCategories: context.topCategories || [],
    topRegions: context.topRegions || [],
    compareMode: context.filters?.compareMode || false,
  };
};

const buildRequestPayload = (question, context) => {
  const normalized = normalizeDrawerContext(context);

  return {
    question,
    data: normalized.data.slice(0, 48),
    context: {
      activeContext: normalized.activeContext,
      contextLabel: normalized.label,
      filters: normalized.filters,
      summary: normalized.summary,
      topCategories: normalized.topCategories,
      topRegions: normalized.topRegions,
      compareMode: normalized.compareMode,
    },
  };
};

const SuggestionsPanel = memo(function SuggestionsPanel({
  contextKey,
  onPickSuggestion,
}) {
  const suggestions =
    CONTEXT_META[contextKey]?.suggestions || CONTEXT_META.revenue_chart.suggestions;

  return (
    <section className="ai-copilot-card">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={15} className="text-cyan-200" />
        <h4 className="text-sm font-semibold text-slate-100">Try asking</h4>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPickSuggestion(suggestion)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
});

const SeriesPreview = memo(function SeriesPreview({ series = [] }) {
  if (!Array.isArray(series) || series.length === 0) return null;

  return (
    <section className="ai-copilot-card">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 size={15} className="text-cyan-200" />
        <h4 className="text-sm font-semibold text-slate-100">Mini trend</h4>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <defs>
              <linearGradient id="aiCopilotSeries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#334155" strokeOpacity={0.35} />
            <XAxis
              dataKey="period"
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: "rgba(148, 163, 184, 0.25)", strokeWidth: 1 }}
              contentStyle={{
                background: "#020617",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: 12,
              }}
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#aiCopilotSeries)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});

const DataTablePreview = memo(function DataTablePreview({ table }) {
  if (!table?.columns?.length || !table?.rows?.length) return null;

  return (
    <section className="ai-copilot-card overflow-hidden">
      <div className="mb-3 flex items-center gap-2">
        <Table2 size={15} className="text-cyan-200" />
        <h4 className="text-sm font-semibold text-slate-100">Table preview</h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm text-slate-300">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-slate-500">
              {table.columns.map((column) => (
                <th key={column} className="px-3 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => {
              const cells = Array.isArray(row)
                ? row
                : table.columns.map((column) => row?.[column] ?? "");

              return (
                <tr
                  key={`${index}-${JSON.stringify(cells)}`}
                  className="border-b border-white/5"
                >
                  {cells.map((value, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className="px-3 py-2">
                    {value}
                  </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
});

const RichAIResponse = memo(function RichAIResponse({ response }) {
  const payload = response?.payload || {};
  const highlights = Array.isArray(payload.highlights) ? payload.highlights : [];
  const metricCards = Array.isArray(payload.metrics) ? payload.metrics : [];

  return (
    <div className="space-y-3">
      {payload.text && (
        <section className="ai-copilot-card">
          <p className="text-sm leading-6 text-slate-200">{payload.text}</p>
        </section>
      )}

      {highlights.length > 0 && (
        <section className="ai-copilot-card">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={15} className="text-cyan-200" />
            <h4 className="text-sm font-semibold text-slate-100">Highlights</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {highlights.map((highlight) => (
              <span
                key={highlight}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100"
              >
                {highlight}
              </span>
            ))}
          </div>
        </section>
      )}

      {metricCards.length > 0 && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metricCards.map((metric) => (
            <article key={metric.label} className="ai-copilot-card">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
              <p className="mt-2 text-lg font-semibold text-white">{metric.value}</p>
              {metric.caption && <p className="mt-1 text-xs text-slate-400">{metric.caption}</p>}
            </article>
          ))}
        </section>
      )}

      {Array.isArray(payload.items) && payload.items.length > 0 && (
        <section className="space-y-2">
          {payload.items.map((item) => (
            <article
              key={item.id || item.title || item.label || item.period}
              className="ai-copilot-card"
            >
              <p className="text-sm font-semibold text-slate-100">
                {item.title || item.label || item.period || "Insight"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                {item.detail || item.reason}
              </p>
            </article>
          ))}
        </section>
      )}

      <SeriesPreview series={payload.series} />
      <DataTablePreview table={payload.table} />
    </div>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="max-w-[92%] rounded-[24px] rounded-bl-md border border-white/10 bg-slate-900/90 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-sm text-cyan-100">
        <LoaderCircle size={15} className="animate-spin" />
        AI analyzing data...
      </div>
      <div className="flex items-center gap-1">
        <span className="ai-copilot-dot" />
        <span className="ai-copilot-dot ai-copilot-dot-delay-1" />
        <span className="ai-copilot-dot ai-copilot-dot-delay-2" />
      </div>
    </div>
  );
});

const AskAIDrawer = memo(function AskAIDrawer({
  isOpen = false,
  onClose,
  context = {},
  onPinInsight,
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [resolvedRequestId, setResolvedRequestId] = useState("");
  const textareaRef = useRef(null);

  const normalizedContext = useMemo(() => normalizeDrawerContext(context), [context]);
  const requestPayload = submittedRequest?.payload || null;
  const { data, isLoading, error } = useAI("nlq", requestPayload);

  useEffect(() => {
    if (!isOpen) return undefined;

    const timeoutId = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 180);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timeoutId);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!submittedRequest || isLoading || !data) return;
    if (resolvedRequestId === submittedRequest.id) return;

    setMessages((previous) => [
      ...previous,
      {
        id: createMessageId("assistant"),
        role: "assistant",
        question: submittedRequest.question,
        response: data,
        requestPayload: submittedRequest.payload,
        requestId: submittedRequest.id,
      },
    ]);
    setResolvedRequestId(submittedRequest.id);
  }, [data, isLoading, resolvedRequestId, submittedRequest]);

  useEffect(() => {
    if (!submittedRequest || isLoading || !error) return;

    const errorId = `${submittedRequest.id}-error`;
    if (resolvedRequestId === errorId) return;

    setMessages((previous) => [
      ...previous,
      {
        id: createMessageId("assistant-error"),
        role: "assistant",
        question: submittedRequest.question,
        response: {
          payload: {
            text: error,
          },
        },
        requestPayload: submittedRequest.payload,
        requestId: errorId,
        isError: true,
      },
    ]);
    setResolvedRequestId(errorId);
  }, [error, isLoading, resolvedRequestId, submittedRequest]);

  const submitQuestion = (questionText) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;

    const requestId = createRequestId();
    const payload = buildRequestPayload(trimmed, normalizedContext);

    setMessages((previous) => [
      ...previous,
      {
        id: createMessageId("user"),
        role: "user",
        text: trimmed,
        requestId,
      },
    ]);
    setSubmittedRequest({
      id: requestId,
      question: trimmed,
      payload,
    });
    setResolvedRequestId("");
    setDraft("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuestion(draft);
  };

  const handleSuggestionPick = (suggestion) => {
    setDraft(suggestion);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(suggestion.length, suggestion.length);
    });
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(draft);
    }
  };

  const showTypingState =
    Boolean(submittedRequest) &&
    isLoading &&
    !messages.some((message) => message.requestId === submittedRequest.id);

  return (
    <div className="ai-copilot-shell" data-open={isOpen}>
      <button
        type="button"
        aria-label="Close AI drawer backdrop"
        className="ai-copilot-backdrop"
        onClick={onClose}
      />

      <aside className="ai-copilot-drawer" aria-hidden={!isOpen}>
        <header className="border-b border-white/10 px-5 py-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-2.5 text-cyan-200">
                <Bot size={18} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                  Analytics Copilot
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">Ask AI</h2>
                <p className="text-sm text-slate-400">
                  Context-aware questions routed through the existing AI gateway
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="ai-copilot-card flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium ${CONTEXT_META[normalizedContext.activeContext]?.accent || "text-cyan-200"}`}
            >
              {normalizedContext.label}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {normalizedContext.filters?.groupBy || "day"} view
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {normalizedContext.filters?.compareMode ? "Compare on" : "Compare off"}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            {messages.length === 0 && (
              <SuggestionsPanel
                contextKey={normalizedContext.activeContext}
                onPickSuggestion={handleSuggestionPick}
              />
            )}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "user" ? (
                  <div className="max-w-[86%] rounded-[24px] rounded-br-md border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
                    {message.text}
                  </div>
                ) : (
                  <div className="max-w-[92%] space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 p-1.5 text-cyan-200">
                        <Bot size={14} />
                      </span>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        AI response
                      </p>
                    </div>

                    <RichAIResponse response={message.response} />

                    {!message.isError && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            onPinInsight?.({
                              id: message.requestId,
                              intent: "nlq",
                              title: trimQuestion(message.question),
                              payload: message.requestPayload,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition-colors hover:bg-cyan-400/15"
                        >
                          <Pin size={13} />
                          Pin Insight
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}

            {showTypingState && <TypingIndicator />}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-white/10 px-5 py-4">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/90 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.32)]">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleInputKeyDown}
                rows={1}
                placeholder={`Ask about ${normalizedContext.label.toLowerCase()}...`}
                className="max-h-32 min-h-[54px] flex-1 resize-none bg-transparent px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-500 text-white shadow-[0_0_30px_rgba(34,211,238,0.35)] transition-transform duration-200 hover:scale-[1.03]"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
});

export default AskAIDrawer;
