function normalizeCsvRow(row, batchId) {
  if (!row.title || !row.value) return null;

  return {
    title: row.title.trim(),
    value: Number(row.value),

    // Optional, future-proof fields
    region: row.region || "unknown",
    channel: row.channel || "csv",

    source: "csv",
    batchId,
    version: 1,
    rawData: row
  };
}

module.exports = { normalizeCsvRow };
