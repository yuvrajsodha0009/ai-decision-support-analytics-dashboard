import axios from 'axios';

const BASE = 'http://localhost:5000/api/auth';

export const register = (data) => axios.post(`${BASE}/register`, data);
export const login = (data) => axios.post(`${BASE}/login`, data);
export const me = (token) =>
  axios.get(`${BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
export const requestPasswordOtp = (data) =>
  axios.post(`${BASE}/request-password-otp`, data);
export const resetPassword = (data) => axios.post(`${BASE}/reset-password`, data);
