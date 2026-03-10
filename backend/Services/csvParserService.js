// Ingestion/parsing layer: parses CSV files and exposes normalized row/header outputs.
const fs = require("fs");
const csv = require("csv-parser");

function parseCsvFile(filePath, { sampleSize = 5, collectAllRows = false } = {}) {
  return new Promise((resolve, reject) => {
    const headers = [];
    const sampleRows = [];
    const rows = [];

    const stream = fs
      .createReadStream(filePath)
      .pipe(csv())
      .on("headers", (csvHeaders) => {
        headers.push(...csvHeaders);
      })
      .on("data", (row) => {
        if (sampleRows.length < sampleSize) sampleRows.push(row);
        if (collectAllRows) rows.push(row);
      })
      .on("error", reject)
      .on("end", () => {
        resolve({
          headers,
          sampleRows,
          rows,
        });
      });

    stream.on("error", reject);
  });
}

async function parseHeadersAndSample(filePath, sampleSize = 5) {
  const result = await parseCsvFile(filePath, { sampleSize, collectAllRows: false });
  return {
    headers: result.headers,
    sampleRows: result.sampleRows,
  };
}

async function parseAllRows(filePath) {
  const result = await parseCsvFile(filePath, { sampleSize: 0, collectAllRows: true });
  return result.rows;
}

module.exports = {
  parseHeadersAndSample,
  parseAllRows,
};
