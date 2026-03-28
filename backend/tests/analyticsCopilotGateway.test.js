const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCopilotUiPayload,
  normalizeAnalyticsCopilotPayload,
} = require("../Services/ai/analyticsCopilotGateway");

test("normalizeAnalyticsCopilotPayload prefers context filters and trims history/data", () => {
  const payload = {
    question: "Why did revenue dip?",
    filters: { date_range: "today" },
    history: Array.from({ length: 12 }).map((_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `turn ${index + 1}`,
    })),
    data: Array.from({ length: 65 }).map((_, index) => ({
      period: `2026-03-${String(index + 1).padStart(2, "0")}`,
      currentRevenue: 1000 + index,
      unused: "drop-me",
    })),
    context: {
      activeContext: "revenue_chart",
      filters: {
        start: "2026-03-18",
        end: "2026-03-24",
        compareMode: true,
      },
      summary: {
        totalRevenue: 12345,
        totalOrders: 42,
      },
      dashboardData: {
        revenueSeries: [{ period: "2026-03-24", currentRevenue: 9000, extra: "x" }],
        unrelatedSeries: [{ foo: "bar" }],
      },
    },
  };

  const normalized = normalizeAnalyticsCopilotPayload(payload, { id: "u1", role: "admin" }, "test");

  assert.equal(normalized.intent, "analytics_copilot");
  assert.equal(normalized.filters.start, "2026-03-18");
  assert.equal(normalized.filters.compareMode, true);
  assert.equal(normalized.context.filters.start, "2026-03-18");
  assert.equal(normalized.context.chatHistory.length, 10);
  assert.equal(normalized.data.length, 60);
  assert.deepEqual(Object.keys(normalized.data[0]).sort(), ["currentRevenue", "label", "period"]);
  assert.deepEqual(Object.keys(normalized.context.dashboardData), ["revenueSeries"]);
});

test("buildCopilotUiPayload adapts canonical v2 responses for the existing UI", () => {
  const uiPayload = buildCopilotUiPayload({
    answer: {
      primary_insight: "Revenue rebounded on 22 Mar after a one-day dip.",
      prioritized_insights: [
        "Revenue dropped 46.99% on 21 Mar.",
        "Revenue rebounded 186.48% on 22 Mar.",
      ],
      sections: {
        key_insight: "Revenue rebounded to Rs 11,633,265.84 on 22 Mar after the prior-day drop.",
        supporting_evidence: [
          "Revenue fell from Rs 7,665,683.76 on 20 Mar to Rs 4,061,140.52 on 21 Mar.",
          "It then rose to Rs 11,633,265.84 on 22 Mar.",
        ],
        conclusion: "The break was sharp but short-lived within the current window.",
        recommendations: ["Check what changed between 21 Mar and 22 Mar in channel mix and order volume."],
      },
      follow_up_suggestion: "Would you like the same comparison on orders versus revenue?",
    },
    artifacts: {
      chart: {
        chartType: "line",
        title: "Revenue trend",
        data: [
          { label: "2026-03-21", value: 4061140.52 },
          { label: "2026-03-22", value: 11633265.84 },
        ],
      },
      table: {
        columns: ["label", "value"],
        rows: [
          ["2026-03-21", 4061140.52],
          ["2026-03-22", 11633265.84],
        ],
      },
    },
    query_executed: {
      query_type: "diagnostic",
      confidence_score: 0.82,
    },
    data_source: "hybrid",
    meta: {
      provider: "unit-test",
    },
  });

  assert.equal(uiPayload.answerType, "chart");
  assert.equal(uiPayload.chartType, "line");
  assert.equal(uiPayload.highlights.length, 2);
  assert.equal(uiPayload.items.length, 4);
  assert.match(uiPayload.text, /Revenue rebounded to Rs 11,633,265\.84 on 22 Mar/);
  assert.equal(uiPayload.metrics[0].value, "82%");
});
