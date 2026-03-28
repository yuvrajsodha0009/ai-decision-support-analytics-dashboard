const CONTEXT_META = {
  revenue_chart: {
    label: "Revenue chart",
  },
  orders_chart: {
    label: "Orders chart",
  },
  category_chart: {
    label: "Category chart",
  },
};

export const normalizeDrawerContext = (context = {}) => {
  const activeContext = context.activeContext || "revenue_chart";

  return {
    activeContext,
    label: CONTEXT_META[activeContext]?.label || "Dashboard context",
    filters: context.filters || {},
    data: Array.isArray(context.data) ? context.data : [],
    summary: context.summary || {},
    topCategories: context.topCategories || [],
    topRegions: context.topRegions || [],
    dashboardData: context.dashboardData || {},
    compareMode: context.filters?.compareMode || false,
  };
};

export const buildConversationMemory = (messages = []) => {
  const memory = [];

  for (const message of messages) {
    if (message?.role === "user" && message?.text) {
      memory.push({ role: "user", content: String(message.text) });
      continue;
    }

    if (message?.role === "assistant") {
      const assistantText = String(message?.response?.payload?.text || "").trim();
      if (assistantText) {
        memory.push({ role: "assistant", content: assistantText });
      }
    }
  }

  return memory.slice(-10);
};

export const buildRequestPayload = (question, context, conversationMemory = []) => {
  const normalized = normalizeDrawerContext(context);

  return {
    question,
    data: normalized.data.slice(0, 60),
    history: Array.isArray(conversationMemory) ? conversationMemory : [],
    context: {
      activeContext: normalized.activeContext,
      contextLabel: normalized.label,
      filters: normalized.filters,
      summary: normalized.summary,
      topCategories: normalized.topCategories,
      topRegions: normalized.topRegions,
      dashboardData: normalized.dashboardData,
      compareMode: normalized.compareMode,
    },
  };
};
