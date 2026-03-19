import axios from "axios";

const BASE = "http://localhost:5000/api/users";

export const fetchCurrentUser = async () => {
  const response = await axios.get(`${BASE}/me`);
  return response.data;
};

export const updateAnalyticsDateRangePreference = async (payload) => {
  const response = await axios.put(`${BASE}/preferences/date-range`, payload);
  return response.data;
};
