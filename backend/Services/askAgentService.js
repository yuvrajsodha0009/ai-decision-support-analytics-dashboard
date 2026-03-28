const axios = require("axios");

const DEFAULT_ASK_AGENT_URL = "http://127.0.0.1:8010/analyze";

exports.sendToAskAgent = async (payload) => {
  const targetUrl = process.env.ASK_AGENT_URL || DEFAULT_ASK_AGENT_URL;

  const response = await axios.post(targetUrl, payload, {
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data;
};
