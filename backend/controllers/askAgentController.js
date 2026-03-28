const { sendToAskAgent } = require("../Services/askAgentService");
const {
  buildCopilotUiPayload,
  normalizeAnalyticsCopilotPayload,
} = require("../Services/ai/analyticsCopilotGateway");

exports.askAgent = async (req, res) => {
  try {
    const payload = req.body?.payload || {};
    const normalizedPayload = normalizeAnalyticsCopilotPayload(
      payload,
      req.user || {},
      "ask-agent",
    );

    if (!normalizedPayload.question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const askAgentResponse = await sendToAskAgent(normalizedPayload);

    return res.json({
      intent: "analytics_copilot",
      payload: buildCopilotUiPayload(askAgentResponse),
      meta: {
        provider: askAgentResponse?.meta?.provider || "python-ask-agent",
        queryExecuted: askAgentResponse?.query_executed || null,
      },
    });
  } catch (error) {
    console.error("[askAgentController] Ask agent request failed", {
      message: error.message,
      status: error.response?.status,
      detail: error.response?.data,
    });

    if (error.response) {
      const status = error.response.status >= 500 ? 502 : error.response.status;
      return res.status(status).json({
        message: error.response?.data?.detail || "Ask agent service request failed",
      });
    }

    return res.status(502).json({
      message: "Ask agent service is unavailable",
    });
  }
};
