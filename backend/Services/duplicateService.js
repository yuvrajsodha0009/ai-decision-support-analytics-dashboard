// Duplicate detection layer: hashes rows using canonical JSON to support deterministic SHA256 dedupe.
const crypto = require("crypto");

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  return value;
}

function createRowHash(row) {
  const canonicalJson = JSON.stringify(canonicalize(row || {}));
  return crypto.createHash("sha256").update(canonicalJson).digest("hex");
}

function detectDuplicateRows(rows = []) {
  const seen = new Map();
  const rowHashes = [];
  const duplicateRowIndexes = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const hash = createRowHash(row);
    rowHashes.push(hash);

    if (seen.has(hash)) {
      duplicateRowIndexes.add(rowNumber);
    } else {
      seen.set(hash, rowNumber);
    }
  });

  return {
    rowHashes,
    duplicateRowIndexes,
    duplicateCount: duplicateRowIndexes.size,
  };
}

module.exports = {
  createRowHash,
  detectDuplicateRows,
};
