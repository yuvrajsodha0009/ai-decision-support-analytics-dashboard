import axios from "axios";

const BASE = "http://localhost:5000/api/data-cleaning";

export async function preprocessFile(formData) {
  const res = await axios.post(`${BASE}/preprocess`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export function exportPdf() {
  window.location.href = `${BASE}/export/pdf`;
}

export function exportExcel() {
  window.location.href = `${BASE}/export/excel`;
}

export async function getProcessedData() {
  const res = await axios.get(`${BASE}/processed-data`);
  return res.data;
}

export async function getControlStatus() {
  const res = await axios.get(`${BASE}/control/status`);
  return res.data;
}

export async function getProcessingLogs() {
  const res = await axios.get(`${BASE}/control/logs`);
  return res.data;
}

export async function approveProcessedData(approvedBy = "admin") {
  const res = await axios.post(`${BASE}/control/approve`, { approvedBy });
  return res.data;
}

export async function resetPreprocessing() {
  const res = await axios.post(`${BASE}/control/reset`);
  return res.data;
}

export async function triggerPreprocessing(note = "Manual trigger") {
  const res = await axios.post(`${BASE}/control/trigger`, { note });
  return res.data;
}
