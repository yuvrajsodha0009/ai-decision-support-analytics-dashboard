import axios from "axios";

export const fetchAIInsight = async (intent, payload) => {
  const response = await axios.post("/api/ai/insight", {
    intent,
    payload,
  });

  return response.data;
};

export const fetchAskAgentInsight = async (payload) => {
  const response = await axios.post("/api/ai/ask-agent", {
    payload,
  });

  return response.data;
};
