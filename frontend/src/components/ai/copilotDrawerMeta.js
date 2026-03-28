import {
  BarChart3,
  LayoutGrid,
  MessageCircle,
  TrendingUp,
} from "lucide-react";

export const CONTEXT_META = {
  revenue_chart: {
    label: "Revenue chart",
    subtitle:
      "Trace spikes, dips, and momentum shifts with grounded explanations and next-step ideas.",
    suggestions: [
      "Why did revenue spike yesterday?",
      "What changed in the revenue trend this week?",
      "Summarize revenue momentum for leadership.",
      "Compare this week's revenue with the previous week.",
    ],
    capabilities: [
      {
        title: "Explain changes",
        description: "Pinpoint the dates, values, and movement behind sudden swings.",
        icon: TrendingUp,
      },
      {
        title: "Compare windows",
        description: "Measure one period against another with clear deltas and context.",
        icon: LayoutGrid,
      },
      {
        title: "Recommend actions",
        description: "Turn evidence into practical next moves worth testing.",
        icon: MessageCircle,
      },
    ],
    popularGroups: [
      {
        label: "Fast diagnostics",
        questions: [
          "What caused the biggest dip in revenue this range?",
          "Which day contributed most to total revenue?",
        ],
      },
      {
        label: "Strategic follow-ups",
        questions: [
          "What should I investigate next in this revenue trend?",
          "What actions would help sustain the strongest day?",
        ],
      },
    ],
  },
  orders_chart: {
    label: "Orders chart",
    subtitle:
      "Break down order-volume movement, compare periods, and isolate the strongest operational signals.",
    suggestions: [
      "Which period drove the most orders?",
      "Show order trend differences versus the previous period.",
      "What should I inspect in the orders trend next?",
      "Was order growth steady or concentrated on specific dates?",
    ],
    capabilities: [
      {
        title: "Find the surge",
        description: "Highlight where order volume accelerated or stalled across the range.",
        icon: TrendingUp,
      },
      {
        title: "Compare periods",
        description: "See whether growth is broad-based or dependent on just a few days.",
        icon: LayoutGrid,
      },
      {
        title: "Investigate drivers",
        description: "Connect order movement to nearby revenue and dashboard signals.",
        icon: MessageCircle,
      },
    ],
    popularGroups: [
      {
        label: "Operational checks",
        questions: [
          "Which dates had the weakest order volume and by how much?",
          "Did orders rebound after the main dip in this range?",
        ],
      },
      {
        label: "Action-oriented asks",
        questions: [
          "What should operations review first in this order trend?",
          "Which follow-up chart would best explain the order pattern here?",
        ],
      },
    ],
  },
  category_chart: {
    label: "Category chart",
    subtitle:
      "Compare leaders and laggards, surface category concentration, and identify where attention is needed.",
    suggestions: [
      "Which category drives most revenue right now?",
      "Which category needs attention right now?",
      "Compare category leaders and laggards.",
      "What category mix shift stands out in this view?",
    ],
    capabilities: [
      {
        title: "Surface leaders",
        description: "Identify the strongest categories and quantify their advantage clearly.",
        icon: BarChart3,
      },
      {
        title: "Spot laggards",
        description: "Show which categories are underperforming or losing momentum.",
        icon: TrendingUp,
      },
      {
        title: "Plan next moves",
        description: "Turn category evidence into concrete actions or deeper questions.",
        icon: MessageCircle,
      },
    ],
    popularGroups: [
      {
        label: "Portfolio questions",
        questions: [
          "Which category has the biggest gap versus the leader?",
          "Is revenue concentrated in one category or spread across several?",
        ],
      },
      {
        label: "Decision support",
        questions: [
          "Which category should I investigate next and why?",
          "What action would you recommend for the weakest category?",
        ],
      },
    ],
  },
};

export const formatDateValue = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatLabel = (value) =>
  String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatFilterValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => formatFilterValue(entry)).filter(Boolean).join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }

  if (typeof value === "number") {
    return Number(value).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
  }

  return formatDateValue(value) || String(value || "");
};

export const getContextHealth = (context = {}) => {
  const summaryValues = Object.values(context.summary || {}).filter(Boolean);
  return Boolean(
    context.data?.length ||
      context.topCategories?.length ||
      context.topRegions?.length ||
      summaryValues.length,
  );
};

export const buildContextOverview = (context = {}) => {
  const filters = context.filters || {};
  const nonDefaultFilters = Object.entries(filters)
    .filter(
      ([key, value]) =>
        !["start", "end", "groupBy", "timezone", "compareMode"].includes(key) &&
        value !== "" &&
        value !== null &&
        value !== undefined &&
        (!Array.isArray(value) || value.length > 0),
    )
    .map(([key, value]) => ({
      label: formatLabel(key),
      value: formatFilterValue(value),
    }))
    .filter((entry) => entry.value);

  const chips = [
    {
      label: "Dataset",
      value: context.label,
    },
    filters.start && filters.end
      ? {
          label: "Window",
          value: `${formatDateValue(filters.start)} - ${formatDateValue(filters.end)}`,
        }
      : null,
    filters.groupBy
      ? {
          label: "Grouping",
          value: formatLabel(filters.groupBy),
        }
      : null,
    {
      label: "Compare",
      value: context.compareMode ? "Enabled" : "Off",
    },
    context.data?.length
      ? {
          label: "Rows",
          value: `${context.data.length} ready`,
        }
      : null,
  ].filter(Boolean);

  return {
    chips,
    filters: nonDefaultFilters.slice(0, 6),
    filterCount: nonDefaultFilters.length,
    hasContext: getContextHealth(context),
  };
};

export const getContextMeta = (activeContext) =>
  CONTEXT_META[activeContext] || CONTEXT_META.revenue_chart;
