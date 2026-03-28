const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  getCacheKey,
  getCached,
  setCache,
} = require("../services/ai/cache");

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
];

const sanitizeDataForPrompt = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 24);
};

const shouldUseFounderSummaryStyle = (payload) => {
  if (payload?.intent !== "nlq") return false;
  return payload?.context?.outputStyle === "founder_summary";
};

const buildPrompt = (payload) => {
  const intent = payload?.intent || "nlq";
  const metric = payload?.metric || "revenue";
  const question = payload?.question || "Provide business insights";
  const filters = payload?.filters || {};
  const data = sanitizeDataForPrompt(payload?.data);

  if (shouldUseFounderSummaryStyle(payload)) {
    return [
      "You are a senior ecommerce growth analyst.",
      "Your job is NOT to describe data.",
      "Your job is to explain what is happening, why it is happening, and what should be done next.",
      "",
      "CRITICAL RULES:",
      "- Avoid generic phrases like 'this might indicate'.",
      "- Avoid repeating numbers unless necessary.",
      "- Every insight must include a clear business implication.",
      "- Every action must be specific and practical.",
      "- Rank insights by importance (most critical first).",
      "- Clearly highlight the #1 issue.",
      "- Use confidence labels in each key insight:",
      "  - High confidence -> direct statement",
      "  - Medium confidence -> use 'likely'",
      "  - Low confidence -> use 'possible'",
      "- If no strong issue exists, explicitly say 'performance is stable'.",
      "- Be concise and sharp.",
      "",
      "REASONING SEQUENCE:",
      "1) Detect trend (up/down/volatile)",
      "2) Identify anomalies (spikes/drops)",
      "3) Infer causes (pricing, traffic, funnel, behavior)",
      "4) Translate into business impact",
      "",
      "FORMAT STRICTLY (use these exact section headers):",
      "## Overview",
      "(1-2 lines only, sharp and decisive)",
      "",
      "## Key Insights",
      "- Max 4 bullets",
      "- Each bullet must be: insight + implication in one line",
      "- First bullet must be '#1 issue:' and the most critical insight",
      "- Focus only on what matters most",
      "",
      "## Risks",
      "- Max 2-3 bullets",
      "- Include only important, real risks",
      "",
      "## Actions",
      "- Max 3 bullets",
      "- Only high-impact actions",
      "- Make each action specific and practical",
      "",
      "## One-Line Summary",
      "- One strong executive takeaway sentence",
      "",
      "STYLE:",
      "- Confident",
      "- Analytical",
      "- No fluff",
      "- No filler words",
      "",
      "HARD CONSTRAINTS:",
      "- Do not dump raw tables or date-by-date narration.",
      "- Keep number mentions minimal; include numbers only where needed for a decision.",
      "- Use decisive language; only use 'likely' and 'possible' when confidence is medium or low.",
      "- Output markdown only.",
      "- Think like: what should the founder fix today?",
      "",
      `Question: ${question}`,
      `Metric: ${metric}`,
      `Filters: ${JSON.stringify(filters)}`,
      `Input data (JSON): ${JSON.stringify(data)}`,
    ].join("\n");
  }

  return [
    "You are a senior analytics assistant for an ecommerce dashboard.",
    "Return only markdown and keep it concise, practical, and executive-friendly.",
    "Structure output with these sections:",
    "1) Snapshot",
    "2) Key Drivers",
    "3) Risks",
    "4) Actions",
    "5) One-line Summary",
    "",
    `Intent: ${intent}`,
    `Metric: ${metric}`,
    `Question: ${question}`,
    `Filters: ${JSON.stringify(filters)}`,
    `Data: ${JSON.stringify(data)}`,
  ].join("\n");
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const extractMetricValue = (row, metric) => {
  if (!row || typeof row !== "object") return 0;

  if (metric === "orders") {
    return toNumber(row.currentOrders ?? row.totalOrders ?? row.orders ?? row.currentValue);
  }

  if (metric === "aov") {
    return toNumber(row.currentAov ?? row.aov ?? row.avgOrderValue ?? row.currentValue);
  }

  return toNumber(
    row.currentRevenue ?? row.totalRevenue ?? row.revenue ?? row.currentValue ?? row.value,
  );
};

const generateLocalFallback = (payload, reason) => {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const metric = payload?.metric || "revenue";
  const values = rows.map((row) => extractMetricValue(row, metric));

  const first = values.length ? values[0] : 0;
  const last = values.length ? values[values.length - 1] : 0;
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;

  const trend =
    values.length < 2
      ? "stable"
      : last > first * 1.05
        ? "growth"
        : last < first * 0.95
          ? "decline"
          : "stable";

  const high = values.length ? Math.max(...values) : 0;
  const low = values.length ? Math.min(...values) : 0;
  const mean =
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const variance =
    values.length > 0
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
      : 0;
  const volatility = mean > 0 ? Math.sqrt(variance) / mean : 0;
  const volatilityLabel =
    volatility >= 0.2 ? "high" : volatility >= 0.1 ? "moderate" : "contained";
  const movementLabel =
    Math.abs(changePct) >= 12
      ? "sharp"
      : Math.abs(changePct) >= 5
        ? "noticeable"
        : "mild";

  const metricLabel = metric.toUpperCase();
  const formatCompact = (value) =>
    Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const stablePerformance = Math.abs(changePct) < 5 && volatility < 0.08;
  const severeDecline = trend === "decline" && Math.abs(changePct) >= 12;

  const confidenceTag = (score) => {
    if (score >= 0.75) return "High confidence";
    if (score >= 0.45) return "Medium confidence";
    return "Low confidence";
  };

  const confidenceVerb = (score) => {
    if (score >= 0.75) return "";
    if (score >= 0.45) return "likely ";
    return "possible ";
  };

  const primaryIssue = stablePerformance
    ? "performance is stable"
    : severeDecline
      ? "order momentum is deteriorating"
      : volatility >= 0.12
        ? "demand quality is inconsistent"
        : "growth is not compounding";

  const issueImpact = stablePerformance
    ? "near-term execution risk is controlled"
    : severeDecline
      ? "revenue pacing and CAC payback will worsen this cycle"
      : volatility >= 0.12
        ? "forecast reliability and budget pacing are weakened"
        : "scaling spend now risks inefficient acquisition";

  const insightVariant = Math.abs(Math.round(changePct) + values.length) % 3;
  const causeLineByVariant = [
    "Traffic quality is uneven, so volume gains are not converting into predictable value.",
    "Offer and pricing mix is shifting too often, so value per order is not compounding.",
    "Campaign outcomes are bursty, so planning assumptions break between cycles.",
  ];

  const confidencePrimary = confidenceTag(stablePerformance ? 0.9 : 0.82);
  const confidenceBand = confidenceTag(volatility >= 0.15 ? 0.8 : 0.6);
  const confidenceCause = confidenceTag(volatility >= 0.12 ? 0.6 : 0.4);

  const primaryVerb = confidenceVerb(stablePerformance ? 0.9 : 0.82);
  const bandVerb = confidenceVerb(volatility >= 0.15 ? 0.8 : 0.6);
  const causeVerb = confidenceVerb(volatility >= 0.12 ? 0.6 : 0.4);

  const overviewLine = stablePerformance
    ? `Performance is stable for ${metricLabel}, with controlled movement and no urgent demand breakdown.`
    : `Performance is in a **${movementLabel} ${trend}** phase for ${metricLabel}, and momentum is ${trend === "decline" ? "weak" : "inconsistent"}.`;

  const text = [
    "## Overview",
    overviewLine,
    "",
    "## Key Insights",
    `- #1 issue: ${confidencePrimary}: ${primaryVerb}${primaryIssue}, so ${issueImpact}.`,
    `- ${confidenceBand}: The value band (${formatCompact(low)} to ${formatCompact(high)}) ${bandVerb}reflects mix instability, which makes weekly forecasts less dependable.`,
    `- ${confidenceCause}: ${causeVerb}${causeLineByVariant[insightVariant]} That increases execution risk in channel and pricing decisions.`,
    stablePerformance
      ? "- High confidence: Performance is stable, so the immediate focus should be efficiency gains rather than corrective firefighting."
      : "- Medium confidence: Movement is not compounding, so scaling budget now would likely dilute return on spend.",
    "",
    "## Risks",
    stablePerformance
      ? "- No critical risk is escalating today; the risk is complacency while competitors improve conversion efficiency."
      : trend === "decline"
        ? "- Continued decline will raise CAC payback pressure as order quality weakens."
        : "- Short-lived spikes can create false confidence and lead to over-allocation of spend.",
    stablePerformance
      ? "- If pricing and mix checks are delayed, margin softness can emerge without an obvious top-line warning signal."
      : "- Volatility raises inventory and budget pacing risk, increasing the chance of margin leakage.",
    "",
    "## Actions",
    stablePerformance
      ? "- Protect momentum: run a 5-day conversion optimization sprint on checkout drop-off segments and lock the winning variant."
      : "- Founder fix today: audit the last 7 days of campaigns by channel and creative, then pause segments driving high clicks but weak checkout completion.",
    "- Run a pricing and bundle test on top SKUs this week to stabilize AOV and reduce mix-driven volatility.",
    stablePerformance
      ? "- Shift 10-15% budget toward highest-retention cohorts to improve contribution margin without forcing top-line growth."
      : "- Launch a 14-day repeat-order retention flow for recent buyers to offset paid acquisition dependence.",
    "",
    "## One-Line Summary",
    stablePerformance
      ? `- ${metricLabel} performance is stable, so today\'s win is tightening efficiency before pursuing more scale.`
      : `- ${metricLabel} performance is ${trend === "decline" ? "slipping" : "unstable"}, and today\'s priority is fixing demand quality before scaling spend.`,
  ].join("\n");

  return {
    intent: payload.intent,
    payload: {
      text,
    },
    meta: {
      provider: "local-fallback",
      reason,
      generatedAt: new Date().toISOString(),
    },
  };
};

const generateWithGemini = async (payload) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in backend .env");
  }

  const preferredModel = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const modelCandidates = [
    preferredModel,
    ...GEMINI_MODEL_FALLBACKS.filter((name) => name !== preferredModel),
  ];

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildPrompt(payload);

  let lastError = null;

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.() || "No insights generated.";

      return {
        intent: payload.intent,
        payload: {
          text,
        },
        meta: {
          provider: "gemini",
          model: modelName,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "");
      const isModelNotFound = message.includes("is not found") || message.includes("404");
      if (!isModelNotFound) {
        throw error;
      }
    }
  }

  throw lastError || new Error("No supported Gemini model is available for this key");
};

const generateWithGroq = async (payload) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing in backend .env");
  }

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const prompt = buildPrompt(payload);

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are a senior analytics assistant. Return only markdown.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    },
    {
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const text =
    response?.data?.choices?.[0]?.message?.content?.trim() ||
    "No insights generated.";

  return {
    intent: payload.intent,
    payload: {
      text,
    },
    meta: {
      provider: "groq",
      model,
      generatedAt: new Date().toISOString(),
    },
  };
};

exports.sendToAI = async (payload) => {
  const cacheKey = getCacheKey(payload);
  const cachedValue = getCached(cacheKey);

  if (cachedValue) {
    return {
      result: cachedValue,
      cached: true,
    };
  }

  let responseData;

  try {
    responseData = await generateWithGemini(payload);
  } catch (error) {
    const message = String(error?.message || "");
    const geminiReason = message.includes("quota") || message.includes("429")
      ? "gemini_quota_exceeded"
      : "gemini_unavailable";

    try {
      responseData = await generateWithGroq(payload);
    } catch (groqError) {
      responseData = generateLocalFallback(payload, `${geminiReason}_and_groq_unavailable`);
    }
  }

  setCache(cacheKey, responseData);

  return {
    result: responseData,
    cached: false,
  };
};
