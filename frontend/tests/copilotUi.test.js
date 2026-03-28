import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConversationMemory,
  buildRequestPayload,
  normalizeDrawerContext,
} from "../src/components/ai/copilotUi.js";

test("buildConversationMemory keeps the most recent 10 turns", () => {
  const messages = Array.from({ length: 14 }).map((_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    text: index % 2 === 0 ? `question ${index + 1}` : undefined,
    response:
      index % 2 === 1
        ? {
            payload: {
              text: `answer ${index + 1}`,
            },
          }
        : undefined,
  }));

  const memory = buildConversationMemory(messages);

  assert.equal(memory.length, 10);
  assert.equal(memory[0].content, "question 5");
  assert.equal(memory.at(-1).content, "answer 14");
});

test("buildRequestPayload preserves the normalized context contract", () => {
  const context = {
    activeContext: "orders_chart",
    filters: {
      start: "2026-03-18",
      end: "2026-03-24",
      compareMode: true,
    },
    data: Array.from({ length: 70 }).map((_, index) => ({
      period: `row-${index + 1}`,
      currentOrders: 10 + index,
    })),
    summary: {
      totalRevenue: 100,
      totalOrders: 25,
    },
    topCategories: [{ category: "Shoes", orders: 10 }],
    topRegions: [{ region: "North", orders: 12 }],
    dashboardData: {
      ordersSeries: [{ period: "2026-03-24", currentOrders: 25 }],
    },
  };

  const normalized = normalizeDrawerContext(context);
  const payload = buildRequestPayload("Compare orders this week", context, [
    { role: "user", content: "How are orders doing?" },
  ]);

  assert.equal(normalized.label, "Orders chart");
  assert.equal(payload.question, "Compare orders this week");
  assert.equal(payload.data.length, 60);
  assert.equal(payload.context.activeContext, "orders_chart");
  assert.equal(payload.context.filters.compareMode, true);
  assert.equal(payload.history.length, 1);
});
