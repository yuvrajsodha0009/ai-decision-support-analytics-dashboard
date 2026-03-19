const axios = require("axios");

const DEFAULT_AI_URL = "http://localhost:8000/analyze";

exports.sendToAI = async (payload) => {
  const targetUrl = process.env.AI_SERVICE_URL || DEFAULT_AI_URL;

  const response = await axios.post(targetUrl, payload, {
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data;
};
