import {
  BarChart3,
  BrainCircuit,
  Flame,
  MessageCircle,
  Sparkles,
  Table2,
  Zap,
} from "lucide-react";
import { memo, useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

const MAX_SUMMARY_CHARS = 150;
const MAX_EVIDENCE_ITEMS = 4;
const MAX_ACTIONS = 3;
const MAX_FOLLOW_UPS = 3;
const HIDDEN_METRIC_LABELS = new Set(["router confidence", "data source"]);

const normalizeText = (value) => String(value || "").trim();

const dedupe = (values = []) =>
  [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];

const normalizeList = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => normalizeText(entry))
    .filter(Boolean);

const formatSeriesTick = (value) => {
  const text = normalizeText(value);
  if (!text) return "-";

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  return text.length > 12 ? `${text.slice(0, 10)}...` : text;
};

const formatTableLabel = (value) => {
  const text = normalizeText(value);
  if (!text) return "-";

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return text;
};

const splitIntoSentences = (text) =>
  normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const ensureSentence = (text) => {
  const value = normalizeText(text);
  if (!value) return "";
  return /[.!?]$/.test(value) ? value : `${value}.`;
};

const cleanNarrativeChunk = (text) =>
  normalizeText(text)
    .replace(
      /^(supporting evidence|recommended actions|suggested follow-up|key insight|conclusion|likely cause)\s*:\s*/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

const truncateText = (text, maxLength) => {
  const value = normalizeText(text);
  if (!value || value.length <= maxLength) return value;

  const sliced = value.slice(0, maxLength - 1);
  const boundary = sliced.lastIndexOf(" ");
  return `${(boundary > maxLength * 0.6 ? sliced.slice(0, boundary) : sliced).trim()}...`;
};

const lowercaseLeadingWord = (text) => {
  const value = normalizeText(text);
  if (!value) return "";
  return value.replace(/^[A-Z][a-z]+/, (match) => match.toLowerCase());
};

const splitNarrative = (text) =>
  normalizeText(text)
    .split(/\n{2,}/)
    .map((entry) => cleanNarrativeChunk(entry))
    .filter(Boolean);

const classifyItem = (item = {}) => {
  const title = normalizeText(item.title || item.label).toLowerCase();
  const detail = cleanNarrativeChunk(item.detail || item.reason || item.value);

  if (!detail) return { type: "empty", detail: "" };
  if (title.includes("follow")) return { type: "follow-up", detail };
  if (title.includes("recommend")) return { type: "recommendation", detail };
  if (title.includes("cause")) return { type: "cause", detail };
  if (title.includes("support") || title.includes("evidence")) {
    return { type: "evidence", detail };
  }

  return { type: "detail", detail };
};

const simplifyEvidence = (text) => {
  const cleaned = cleanNarrativeChunk(text)
    .replace(/^(the )/i, "")
    .replace(/^supporting detail:\s*/i, "");

  if (!cleaned) return "";

  const sentence = splitIntoSentences(cleaned)[0] || cleaned;
  return truncateText(sentence, 108);
};

const simplifyAction = (text) => {
  const cleaned = cleanNarrativeChunk(text)
    .replace(/^recommended actions?:\s*/i, "")
    .replace(/^suggested actions?:\s*/i, "")
    .replace(/^next move is to\s*/i, "")
    .replace(/^you should\s*/i, "")
    .replace(/^try to\s*/i, "");

  if (!cleaned) return "";

  const primarySegment =
    cleaned
      .split(/[;|]/)
      .map((entry) => entry.trim())
      .find(Boolean) || cleaned;

  return truncateText(primarySegment, 86);
};

const buildSummary = ({ summaryText, narrative, primaryInsight, evidence }) => {
  const explicitSummary = ensureSentence(
    truncateText(cleanNarrativeChunk(summaryText), MAX_SUMMARY_CHARS),
  );
  if (
    explicitSummary &&
    explicitSummary.toLowerCase() !== normalizeText(primaryInsight).toLowerCase()
  ) {
    return explicitSummary;
  }

  const source =
    splitIntoSentences(narrative[0] || "")[0] ||
    splitIntoSentences(evidence[0] || "")[0] ||
    splitIntoSentences(primaryInsight || "")[0] ||
    "";

  if (!source) return "";

  const concise = truncateText(cleanNarrativeChunk(source), MAX_SUMMARY_CHARS);
  if (!concise) return "";

  if (
    normalizeText(concise).toLowerCase() ===
    normalizeText(primaryInsight).toLowerCase()
  ) {
    return ensureSentence(`In short, ${lowercaseLeadingWord(concise)}`);
  }

  return ensureSentence(
    /^in short|short answer|overall/i.test(concise)
      ? concise
      : `In short, ${lowercaseLeadingWord(concise)}`,
  );
};

const buildFollowUps = ({
  explicitFollowUps = [],
  followUpText = "",
  fallbackOptions = [],
  currentQuestion = "",
}) => {
  const preferred = normalizeList(explicitFollowUps);
  const fallback = preferred.length ? preferred : dedupe([followUpText, ...fallbackOptions]);

  return fallback
    .map((entry) => cleanNarrativeChunk(entry))
    .filter(Boolean)
    .filter((entry) => entry.toLowerCase() !== normalizeText(currentQuestion).toLowerCase())
    .slice(0, MAX_FOLLOW_UPS);
};

const extractPayloadSections = (payload = {}, followUpOptions = [], currentQuestion = "") => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const classified = items.map(classifyItem).filter((item) => item.type !== "empty");
  const evidenceFromItems = classified
    .filter((item) => item.type === "evidence")
    .map((item) => item.detail);
  const recommendationsFromItems = classified
    .filter((item) => item.type === "recommendation")
    .map((item) => item.detail);
  const likelyCauseFromItem =
    classified.find((item) => item.type === "cause")?.detail || "";
  const detailEvidence = classified
    .filter((item) => item.type === "detail")
    .map((item) => item.detail);
  const followUpFromItem = classified.find((item) => item.type === "follow-up")?.detail || "";
  const narrative = splitNarrative(payload.text);
  const primaryInsight = normalizeText(
    payload.primaryInsight || payload.primary_insight,
  );
  const summaryText = normalizeText(payload.aiSummary || payload.ai_summary);
  const explicitEvidence = normalizeList(payload.evidence);
  const highlights = normalizeList(payload.highlights);
  const metricCards = (Array.isArray(payload.metrics) ? payload.metrics : []).filter((metric) => {
    const label = normalizeText(metric?.label).toLowerCase();
    return normalizeText(metric?.label) && normalizeText(metric?.value) && !HIDDEN_METRIC_LABELS.has(label);
  });
  const blockedEvidence = new Set(
    [primaryInsight, summaryText].map((entry) => normalizeText(entry).toLowerCase()).filter(Boolean),
  );
  const recommendations = dedupe([
    ...normalizeList(payload.recommendations),
    ...recommendationsFromItems,
  ])
    .map((entry) => simplifyAction(entry))
    .filter(Boolean)
    .slice(0, MAX_ACTIONS);
  const keyEvidence = dedupe([
    ...explicitEvidence,
    ...evidenceFromItems,
    ...highlights,
    ...detailEvidence,
  ])
    .map((entry) => simplifyEvidence(entry))
    .filter(Boolean)
    .filter((entry) => !blockedEvidence.has(normalizeText(entry).toLowerCase()))
    .slice(0, MAX_EVIDENCE_ITEMS);
  const followUpText = normalizeText(
    payload.followUpSuggestion || payload.follow_up_suggestion || followUpFromItem,
  );
  const followUps = buildFollowUps({
    explicitFollowUps: payload.followUps || payload.follow_up_suggestions,
    followUpText,
    fallbackOptions: followUpOptions,
    currentQuestion,
  });
  const likelyCause = normalizeText(
    payload.likelyCause || payload.likely_cause || likelyCauseFromItem,
  );
  const confidenceLevel = normalizeText(
    payload.confidenceLevel || payload.confidence_level,
  );
  const series = (Array.isArray(payload.series) ? payload.series : []).filter(
    (point) => normalizeText(point?.period) && Number.isFinite(Number(point?.value)),
  );
  const table =
    payload?.table?.columns?.length && payload?.table?.rows?.length
      ? payload.table
      : null;
  const summary = buildSummary({
    summaryText,
    narrative,
    primaryInsight,
    evidence: keyEvidence,
  });

  return {
    summary,
    primaryInsight,
    keyEvidence,
    likelyCause,
    confidenceLevel,
    recommendations,
    followUps,
    metricCards,
    series,
    table,
    expectsVisuals: payload.answerType === "chart",
    narrative,
  };
};

const SectionHeading = memo(function SectionHeading({
  icon: Icon,
  title,
  eyebrow,
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-cyan-100">
        <Icon size={16} />
      </span>
      <div>
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/75">
            {eyebrow}
          </p>
        )}
        <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
      </div>
    </div>
  );
});

const SummaryBlock = memo(function SummaryBlock({ summary }) {
  if (!summary) return null;

  return (
    <section className="ai-copilot-summary-card">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.1] text-cyan-100">
          <MessageCircle size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/75">
            AI summary
          </p>
          <p className="mt-2 text-[15px] leading-7 text-slate-100">{summary}</p>
        </div>
      </div>
    </section>
  );
});

const PrimaryInsightBlock = memo(function PrimaryInsightBlock({
  insight,
  chips = [],
}) {
  if (!insight) return null;

  return (
    <section className="ai-copilot-card ai-copilot-primary-card">
      <SectionHeading icon={Flame} title="Primary insight" eyebrow="Focus" />
      <p className="text-[17px] leading-8 text-slate-50">{insight}</p>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip.label} className="ai-copilot-key-stat">
              <span className="text-slate-400">{chip.label}</span>
              <span className="text-slate-100">{chip.value}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
});

const EvidenceBlock = memo(function EvidenceBlock({ evidence = [] }) {
  if (!evidence.length) return null;

  return (
    <section className="ai-copilot-card ai-copilot-section-card">
      <SectionHeading icon={BarChart3} title="Key evidence" eyebrow="Scannable proof" />
      <div className="space-y-2.5">
        {evidence.map((detail) => (
          <div key={detail} className="ai-copilot-list-row">
            <span className="ai-copilot-bullet" />
            <p className="text-sm leading-6 text-slate-200">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
});

const LikelyCauseBlock = memo(function LikelyCauseBlock({
  likelyCause,
  confidenceLevel,
}) {
  if (!likelyCause) return null;

  return (
    <section className="ai-copilot-card ai-copilot-section-card">
      <SectionHeading icon={BrainCircuit} title="Likely cause" eyebrow="Reasoned explanation" />
      <div className="space-y-3">
        <p className="text-sm leading-6 text-slate-200">{likelyCause}</p>
        {confidenceLevel && (
          <span className="inline-flex items-center rounded-full border border-cyan-300/18 bg-cyan-400/[0.08] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-cyan-100">
            Confidence: {confidenceLevel}
          </span>
        )}
      </div>
    </section>
  );
});

const ActionsBlock = memo(function ActionsBlock({ actions = [] }) {
  if (!actions.length) return null;

  return (
    <section className="ai-copilot-card ai-copilot-section-card">
      <SectionHeading icon={Zap} title="Suggested actions" eyebrow="Next best moves" />
      <div className="space-y-2.5">
        {actions.map((action) => (
          <div key={action} className="ai-copilot-list-row">
            <span className="ai-copilot-action-badge">+</span>
            <p className="text-sm leading-6 text-slate-200">{action}</p>
          </div>
        ))}
      </div>
    </section>
  );
});

const FollowUpBlock = memo(function FollowUpBlock({
  followUps = [],
  onFollowUp,
  disabled = false,
}) {
  if (!followUps.length) return null;

  return (
    <section className="ai-copilot-card ai-copilot-follow-up-card">
      <SectionHeading icon={Sparkles} title="Try next" eyebrow="Interactive follow-ups" />
      <div className="flex flex-wrap gap-2">
        {followUps.map((suggestion) => {
          const interactive = typeof onFollowUp === "function";
          const Element = interactive ? "button" : "span";

          return (
            <Element
              key={suggestion}
              type={interactive ? "button" : undefined}
              onClick={interactive ? () => onFollowUp(suggestion) : undefined}
              disabled={interactive ? disabled : undefined}
              className={`ai-copilot-follow-up-chip ${interactive ? "is-button" : ""}`}
            >
              {suggestion}
            </Element>
          );
        })}
      </div>
    </section>
  );
});

const SeriesPreview = memo(function SeriesPreview({
  series = [],
  chartType = "line",
}) {
  const gradientId = useId().replace(/:/g, "");

  if (!Array.isArray(series) || series.length === 0) return null;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "bar" ? (
          <BarChart data={series}>
            <CartesianGrid vertical={false} stroke="#334155" strokeOpacity={0.22} />
            <XAxis
              dataKey="period"
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatSeriesTick}
              minTickGap={22}
              interval="preserveStartEnd"
            />
            <Tooltip
              cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
              labelFormatter={formatSeriesTick}
              contentStyle={{
                background: "rgba(4, 10, 24, 0.96)",
                border: "1px solid rgba(125, 211, 252, 0.16)",
                borderRadius: 16,
              }}
            />
            <Bar dataKey="value" fill="#38bdf8" radius={[8, 8, 0, 0]} />
          </BarChart>
        ) : (
          <AreaChart data={series}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.42} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#334155" strokeOpacity={0.22} />
            <XAxis
              dataKey="period"
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatSeriesTick}
              minTickGap={22}
              interval="preserveStartEnd"
            />
            <Tooltip
              cursor={{ stroke: "rgba(125, 211, 252, 0.18)", strokeWidth: 1 }}
              labelFormatter={formatSeriesTick}
              contentStyle={{
                background: "rgba(4, 10, 24, 0.96)",
                border: "1px solid rgba(125, 211, 252, 0.16)",
                borderRadius: 16,
              }}
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke="#38bdf8"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
});

const DataTablePreview = memo(function DataTablePreview({ table }) {
  if (!table?.columns?.length || !table?.rows?.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] text-left text-sm text-slate-200">
        <thead>
          <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {table.columns.map((column) => (
              <th key={column} className="px-3 py-3 font-medium">
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
                className="border-b border-white/5 text-slate-300"
              >
                {cells.map((value, cellIndex) => {
                  const columnName = normalizeText(table.columns[cellIndex]).toLowerCase();
                  const isLabelColumn =
                    columnName.includes("label") ||
                    columnName.includes("date") ||
                    columnName.includes("period");

                  return (
                    <td key={`${index}-${cellIndex}`} className="px-3 py-3">
                      {isLabelColumn ? formatTableLabel(value) : value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

const VisualSection = memo(function VisualSection({
  series = [],
  table = null,
  chartType = "line",
  expectsVisuals = false,
}) {
  const hasChart = series.length > 0;
  const hasTable = Boolean(table?.columns?.length && table?.rows?.length);
  const hasVisuals = hasChart || hasTable;
  const [activeTab, setActiveTab] = useState(hasChart ? "chart" : "table");

  useEffect(() => {
    setActiveTab(hasChart ? "chart" : hasTable ? "table" : "chart");
  }, [hasChart, hasTable]);

  if (!hasVisuals && !expectsVisuals) return null;

  return (
    <section className="ai-copilot-card ai-copilot-section-card">
      <SectionHeading
        icon={hasChart ? BarChart3 : Table2}
        title="Visual context"
        eyebrow="Optional deeper view"
      />

      {hasVisuals ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {hasChart && (
              <button
                type="button"
                onClick={() => setActiveTab("chart")}
                className={`ai-copilot-tab ${activeTab === "chart" ? "ai-copilot-tab-active" : ""}`}
              >
                <BarChart3 size={14} />
                Chart
              </button>
            )}
            {hasTable && (
              <button
                type="button"
                onClick={() => setActiveTab("table")}
                className={`ai-copilot-tab ${activeTab === "table" ? "ai-copilot-tab-active" : ""}`}
              >
                <Table2 size={14} />
                Table
              </button>
            )}
          </div>

          {activeTab === "chart" && hasChart ? (
            <SeriesPreview series={series} chartType={chartType} />
          ) : (
            <DataTablePreview table={table} />
          )}
        </>
      ) : (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
          No chart or table is available for this answer yet. Ask for a comparison or trend view to
          generate visuals.
        </div>
      )}
    </section>
  );
});

const EmptyPayloadState = memo(function EmptyPayloadState() {
  return (
    <section className="ai-copilot-card ai-copilot-section-card text-sm text-slate-400">
      No response content is available yet for this insight.
    </section>
  );
});

const CopilotResponseBlocks = memo(function CopilotResponseBlocks({
  payload = {},
  variant = "drawer",
  followUpOptions = [],
  currentQuestion = "",
  onFollowUp,
  isBusy = false,
}) {
  const sections = useMemo(
    () => extractPayloadSections(payload, followUpOptions, currentQuestion),
    [payload, followUpOptions, currentQuestion],
  );
  const {
    summary,
    primaryInsight,
    keyEvidence,
    likelyCause,
    confidenceLevel,
    recommendations,
    followUps,
    metricCards,
    series,
    table,
    expectsVisuals,
    narrative,
  } = sections;

  const hasStructuredContent =
    Boolean(summary) ||
    Boolean(primaryInsight) ||
    keyEvidence.length > 0 ||
    Boolean(likelyCause) ||
    recommendations.length > 0 ||
    followUps.length > 0 ||
    metricCards.length > 0 ||
    series.length > 0 ||
    Boolean(table);

  if (!hasStructuredContent && narrative.length === 0 && !expectsVisuals) {
    return <EmptyPayloadState />;
  }

  const primaryStatChips = metricCards.slice(0, 2).map((metric) => ({
    label: metric.label,
    value: metric.value,
  }));
  const fallbackNarrative = narrative.slice(0, 1).map((paragraph) =>
    truncateText(paragraph, 180),
  );

  return (
    <div
      className={`space-y-4 ${variant === "pinned" ? "ai-copilot-response-pinned" : "ai-copilot-response-drawer"}`}
    >
      <SummaryBlock summary={summary} />

      <PrimaryInsightBlock insight={primaryInsight} chips={primaryStatChips} />

      <EvidenceBlock evidence={keyEvidence} />

      <LikelyCauseBlock
        likelyCause={likelyCause}
        confidenceLevel={confidenceLevel}
      />

      <ActionsBlock actions={recommendations} />

      <FollowUpBlock
        followUps={followUps}
        onFollowUp={variant === "drawer" ? onFollowUp : undefined}
        disabled={isBusy}
      />

      <VisualSection
        series={series}
        table={table}
        chartType={payload.chartType}
        expectsVisuals={expectsVisuals}
      />

      {!hasStructuredContent &&
        fallbackNarrative.map((paragraph) => (
          <section
            key={paragraph}
            className="ai-copilot-summary-card text-sm leading-6 text-slate-100"
          >
            {paragraph}
          </section>
        ))}
    </div>
  );
});

export default CopilotResponseBlocks;
