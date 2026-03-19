const { sendToAI } = require("../Services/aiService");

const SUPPORTED_INTENTS = new Set([
  "anomaly",
  "forecast",
  "recommendation",
  "nlq",
]);

const buildMockAnalyticsData = (metric = "revenue") => {
  const baseValue = metric === "orders" ? 120 : 125000;

  return Array.from({ length: 6 }).map((_, index) => ({
    period: `P${index + 1}`,
    currentValue: Number((baseValue * (1 + index * 0.04)).toFixed(2)),
  }));
};

const inferMetric = (payload = {}) => {
  if (payload.metric) return payload.metric;

  const firstRow = Array.isArray(payload.data) ? payload.data[0] : null;
  if (firstRow?.currentOrders !== undefined) return "orders";
  if (firstRow?.currentAov !== undefined) return "aov";
  if (firstRow?.currentRevenue !== undefined) return "revenue";
  if (firstRow?.currentValue !== undefined) return "currentValue";

  return "revenue";
};

const normalizePayload = (intent, payload = {}, user = {}) => {
  const metric = inferMetric(payload);
  const data =
    Array.isArray(payload.data) && payload.data.length
      ? payload.data
      : buildMockAnalyticsData(metric);

  return {
    intent,
    metric,
    data,
    filters: payload.filters || {},
    context: {
      source: "node-ai-gateway",
      userId: user.id || null,
      role: user.role || null,
      generatedAt: new Date().toISOString(),
      ...(payload.context || {}),
    },
    question: payload.question || "",
  };
};

exports.getAIInsight = async (req, res) => {
  try {
    const intent = String(req.body?.intent || "").trim().toLowerCase();
    const payload = req.body?.payload || {};

    if (!intent) {
      return res.status(400).json({ message: "Intent is required" });
    }

    if (!SUPPORTED_INTENTS.has(intent)) {
      return res.status(400).json({ message: `Unsupported intent: ${intent}` });
    }

    const normalizedPayload = normalizePayload(intent, payload, req.user || {});
    const aiResponse = await sendToAI(normalizedPayload);

    return res.json(aiResponse);
  } catch (error) {
    console.error("[aiController] Failed to fetch AI insight", {
      message: error.message,
      status: error.response?.status,
      detail: error.response?.data,
    });

    if (error.response) {
      const status = error.response.status >= 500 ? 502 : error.response.status;
      return res.status(status).json({
        message: error.response?.data?.detail || "AI service request failed",
      });
    }

    return res.status(502).json({
      message: "AI service is unavailable",
    });
  }
};
