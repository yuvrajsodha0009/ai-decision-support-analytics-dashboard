const MAX_HISTORY_TURNS = 10;
const MAX_DATA_ROWS = 60;
const MAX_TOP_CATEGORIES = 8;
const MAX_TOP_REGIONS = 6;

const DATA_ROW_KEYS = new Set([
  "period",
  "date",
  "category",
  "region",
  "label",
  "value",
  "currentValue",
  "currentRevenue",
  "currentOrders",
  "currentAov",
  "totalRevenue",
  "totalOrders",
  "revenue",
  "orders",
  "aov",
  "previousRevenue",
  "previousOrders",
  "previousAov",
]);

const DASHBOARD_SERIES_KEYS = new Set([
  "revenueSeries",
  "ordersSeries",
  "categorySeries",
  "regionSeries",
]);

const summarizeText = (value) => String(value || "").trim();

const isMeaningfulValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

const deepPrune = (value) => {
  if (Array.isArray(value)) {
    const items = value
      .map((entry) => deepPrune(entry))
      .filter((entry) => isMeaningfulValue(entry));
    return items;
  }

  if (value && typeof value === "object") {
    const next = Object.entries(value).reduce((acc, [key, entry]) => {
      const pruned = deepPrune(entry);
      if (isMeaningfulValue(pruned)) {
        acc[key] = pruned;
      }
      return acc;
    }, {});
    return next;
  }

  return value;
};

const sanitizeHistory = (history = []) =>
  (Array.isArray(history) ? history : [])
    .map((turn) => ({
      role: summarizeText(turn?.role).toLowerCase(),
      content: summarizeText(turn?.content),
    }))
    .filter((turn) => (turn.role === "user" || turn.role === "assistant") && turn.content)
    .slice(-MAX_HISTORY_TURNS);

const normalizeFilters = (payload = {}) => {
  const candidate = payload?.context?.filters || payload?.filters || {};
  return deepPrune(candidate);
};

const pruneDataRows = (data = []) =>
  (Array.isArray(data) ? data : [])
    .slice(0, MAX_DATA_ROWS)
    .map((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return null;

      const next = {};
      for (const key of DATA_ROW_KEYS) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
          next[key] = row[key];
        }
      }

      if (!next.period && row.date) {
        next.period = row.date;
      }

      if (!next.label && next.period) {
        next.label = next.period;
      }

      if (!next.label && row.category) {
        next.label = row.category;
      }

      if (!next.label && row.region) {
        next.label = row.region;
      }

      if (!Object.keys(next).length) {
        return null;
      }

      if (!next.period && !next.label) {
        next.label = `row-${index + 1}`;
      }

      return next;
    })
    .filter(Boolean);

const pruneNamedRows = (rows = [], allowList = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const next = {};
      for (const key of allowList) {
        if (entry[key] !== undefined && entry[key] !== null && entry[key] !== "") {
          next[key] = entry[key];
        }
      }
      return Object.keys(next).length ? next : null;
    })
    .filter(Boolean);

const pruneDashboardData = (dashboardData = {}, activeContext = "revenue_chart") => {
  const candidate = dashboardData && typeof dashboardData === "object" ? dashboardData : {};
  const keep = new Set(["revenueSeries", "ordersSeries"]);

  if (activeContext === "category_chart") {
    keep.add("categorySeries");
    keep.add("regionSeries");
  }

  const next = {};
  for (const key of DASHBOARD_SERIES_KEYS) {
    if (!keep.has(key)) continue;
    next[key] = pruneDataRows(candidate[key]);
  }

  return deepPrune(next);
};

const pruneContext = (context = {}, filters = {}) => {
  const activeContext = summarizeText(context?.activeContext) || "revenue_chart";

  return deepPrune({
    activeContext,
    contextLabel: summarizeText(context?.contextLabel || context?.label),
    compareMode: Boolean(context?.compareMode || filters?.compareMode),
    filters,
    summary: {
      totalRevenue: context?.summary?.totalRevenue,
      totalOrders: context?.summary?.totalOrders,
      aov: context?.summary?.aov,
      conversionRate: context?.summary?.conversionRate,
    },
    topCategories: pruneNamedRows(context?.topCategories, [
      "category",
      "label",
      "revenue",
      "orders",
      "quantity",
      "value",
    ]).slice(0, MAX_TOP_CATEGORIES),
    topRegions: pruneNamedRows(context?.topRegions, [
      "region",
      "label",
      "revenue",
      "orders",
      "value",
    ]).slice(0, MAX_TOP_REGIONS),
    dashboardData: pruneDashboardData(context?.dashboardData, activeContext),
  });
};

const normalizeAnalyticsCopilotPayload = (payload = {}, user = {}, source = "ask-agent") => {
  const question = summarizeText(payload?.question);
  const filters = normalizeFilters(payload);
  const history = sanitizeHistory(payload?.history);
  const context = pruneContext(payload?.context || {}, filters);

  return {
    intent: "analytics_copilot",
    question,
    filters,
    data: pruneDataRows(payload?.data),
    context: {
      source,
      userId: user.id || null,
      role: user.role || null,
      generatedAt: new Date().toISOString(),
      ...context,
      filters,
      chatHistory: history,
    },
  };
};

const toUiText = (answer = {}) => {
  const sections = answer?.sections || {};
  const lines = [];

  if (answer.ai_summary) {
    lines.push(answer.ai_summary);
  }

  if (sections.key_insight) {
    lines.push(sections.key_insight);
  } else if (answer.primary_insight) {
    lines.push(answer.primary_insight);
  }

  const evidence = Array.isArray(sections.supporting_evidence) ? sections.supporting_evidence : [];
  if (evidence.length > 0) {
    lines.push(`Supporting evidence: ${evidence.join(" ")}`);
  }

  if (sections.conclusion) {
    lines.push(sections.conclusion);
  }

  if (answer.likely_cause) {
    lines.push(
      answer.confidence_level
        ? `Likely cause: ${answer.likely_cause} (confidence: ${answer.confidence_level})`
        : `Likely cause: ${answer.likely_cause}`,
    );
  }

  const recommendations = Array.isArray(sections.recommendations) ? sections.recommendations : [];
  if (recommendations.length > 0) {
    lines.push(`Recommended actions: ${recommendations.join(" ")}`);
  }

  if (answer.follow_up_suggestion) {
    lines.push(`Suggested follow-up: ${answer.follow_up_suggestion}`);
  }

  return lines.filter(Boolean).join("\n\n").trim();
};

const buildUiItems = (answer = {}) => {
  const sections = answer?.sections || {};
  const evidence = Array.isArray(sections.supporting_evidence) ? sections.supporting_evidence : [];
  const recommendations = Array.isArray(sections.recommendations) ? sections.recommendations : [];
  const items = [];

  if (answer.likely_cause) {
    items.push({
      id: "likely-cause",
      title: "Likely cause",
      detail: answer.confidence_level
        ? `${answer.likely_cause} (confidence: ${answer.confidence_level})`
        : answer.likely_cause,
    });
  }

  evidence.forEach((detail, index) => {
    items.push({
      id: `evidence-${index + 1}`,
      title: `Supporting evidence ${index + 1}`,
      detail,
    });
  });

  recommendations.forEach((detail, index) => {
    items.push({
      id: `recommendation-${index + 1}`,
      title: `Recommendation ${index + 1}`,
      detail,
    });
  });

  if (answer.follow_up_suggestion) {
    items.push({
      id: "follow-up-suggestion",
      title: "Suggested follow-up",
      detail: answer.follow_up_suggestion,
    });
  }

  return items;
};

const mapArtifacts = (artifacts = {}) => {
  const chart = artifacts?.chart && typeof artifacts.chart === "object" ? artifacts.chart : null;
  const table = artifacts?.table && typeof artifacts.table === "object" ? artifacts.table : null;
  const chartData = Array.isArray(chart?.data) ? chart.data : [];

  return deepPrune({
    answerType: chartData.length ? "chart" : "text",
    chartType: chart?.chartType || "line",
    series: chartData.map((point) => ({
      period: String(point?.label || "unknown"),
      value: Number(point?.value || 0),
    })),
    table,
  });
};

const buildCopilotUiPayload = (askAgentResponse = {}) => {
  const answer = askAgentResponse?.answer || {};
  const artifacts = mapArtifacts(askAgentResponse?.artifacts || {});
  const prioritizedInsights = Array.isArray(answer?.prioritized_insights)
    ? answer.prioritized_insights.filter(Boolean)
    : [];
  const sections = answer?.sections || {};
  const evidence = Array.isArray(sections?.supporting_evidence)
    ? sections.supporting_evidence.filter(Boolean)
    : [];
  const recommendations = Array.isArray(sections?.recommendations)
    ? sections.recommendations.filter(Boolean)
    : [];
  const followUps = Array.isArray(answer?.follow_up_suggestions)
    ? answer.follow_up_suggestions.filter(Boolean)
    : answer?.follow_up_suggestion
      ? [answer.follow_up_suggestion]
      : [];

  return deepPrune({
    text: toUiText(answer) || summarizeText(answer?.content) || "Response generated.",
    aiSummary: summarizeText(answer?.ai_summary),
    primaryInsight: summarizeText(answer?.primary_insight),
    highlights: evidence.length ? evidence.slice(0, 4) : prioritizedInsights.slice(0, 4),
    evidence,
    likelyCause: summarizeText(answer?.likely_cause),
    confidenceLevel: summarizeText(answer?.confidence_level),
    recommendations,
    followUps,
    items: buildUiItems(answer),
    metrics: [
      askAgentResponse?.query_executed?.confidence_score !== undefined
        ? {
            label: "Router confidence",
            value: `${Math.round(Number(askAgentResponse.query_executed.confidence_score || 0) * 100)}%`,
            caption: askAgentResponse?.query_executed?.query_type || "analytics_copilot",
          }
        : null,
      askAgentResponse?.data_source
        ? {
            label: "Data source",
            value: askAgentResponse.data_source,
            caption: summarizeText(askAgentResponse?.meta?.provider),
          }
        : null,
    ].filter(Boolean),
    ...artifacts,
  });
};

module.exports = {
  buildCopilotUiPayload,
  normalizeAnalyticsCopilotPayload,
  normalizeFilters,
  pruneContext,
  pruneDataRows,
  sanitizeHistory,
};
