import axios from "axios";

export const fetchAIInsight = async (intent, payload) => {
  const response = await axios.post("/api/ai/insight", {
    intent,
    payload,
  });

  return response.data;
};
