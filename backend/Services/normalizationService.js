// Normalization layer: cleans mapped values, preserves raw rows, and provides column-level metadata inference.

function isBlank(value) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function toTrimmedString(value) {
  if (isBlank(value)) return null;
  return String(value).trim();
}

function toNumber(value) {
  if (isBlank(value)) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = String(value).trim().replace(/,/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function looksLikeDate(text) {
  if (!text) return false;
  const value = String(text).trim();
  if (!value) return false;

  const hasWordMonth = /[a-zA-Z]{3,}/.test(value);
  const hasDateSymbols = /[-/:]/.test(value);
  const hasIsoPattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value);
  const hasDmyPattern = /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(value);
  return hasWordMonth || hasDateSymbols || hasIsoPattern || hasDmyPattern;
}

function toDate(value) {
  if (isBlank(value)) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  if (!looksLikeDate(text)) return null;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeRows({ rows = [], mapping = {}, rowHashes = [] }) {
  const normalizedRows = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const normalizedRecord = {
      date: null,
      revenue: null,
      quantity: null,
      product: null,
      customer: null,
      region: null,
      extraFields: {},
      rawData: row,
    };

    const mappedValues = {
      date: null,
      revenue: null,
      quantity: null,
      product: null,
      customer: null,
      region: null,
    };

    const errors = [];
    const warnings = [];
    const isEmptyRow = Object.values(row || {}).every((value) => isBlank(value));

    Object.entries(row || {}).forEach(([column, value]) => {
      const target = mapping[column];
      if (!target || target === "ignore") {
        normalizedRecord.extraFields[column] = value;
        return;
      }

      if (target === "date") {
        const parsedDate = toDate(value);
        normalizedRecord.date = parsedDate;
        mappedValues.date = parsedDate;
        if (!isBlank(value) && !parsedDate) {
          errors.push({ field: "date", issue: "Invalid date format" });
          warnings.push({ field: "date", issue: "Converted to null" });
        }
        return;
      }

      if (target === "revenue") {
        const parsedRevenue = toNumber(value);
        normalizedRecord.revenue = parsedRevenue;
        mappedValues.revenue = parsedRevenue;
        if (!isBlank(value) && parsedRevenue === null) {
          errors.push({ field: "revenue", issue: "Invalid number" });
          warnings.push({ field: "revenue", issue: "Converted to null" });
        }
        return;
      }

      if (target === "quantity") {
        const parsedQuantity = toNumber(value);
        normalizedRecord.quantity = parsedQuantity;
        mappedValues.quantity = parsedQuantity;
        if (!isBlank(value) && parsedQuantity === null) {
          errors.push({ field: "quantity", issue: "Invalid number" });
          warnings.push({ field: "quantity", issue: "Converted to null" });
        }
        return;
      }

      if (target === "product") {
        const productValue = toTrimmedString(value);
        normalizedRecord.product = productValue;
        mappedValues.product = productValue;
        return;
      }

      if (target === "customer") {
        const customerValue = toTrimmedString(value);
        normalizedRecord.customer = customerValue;
        mappedValues.customer = customerValue;
        return;
      }

      if (target === "region") {
        const regionValue = toTrimmedString(value);
        normalizedRecord.region = regionValue;
        mappedValues.region = regionValue;
      }
    });

    normalizedRows.push({
      row: rowNumber,
      rowHash: rowHashes[index] || null,
      rawRow: row,
      normalizedRecord,
      mappedValues,
      isEmptyRow,
      errors,
      warnings,
    });
  });

  return normalizedRows;
}

function normalizeDistinctValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (value instanceof Date) return value.toISOString();
  return String(value).trim().toLowerCase();
}

function detectColumnsMetadata({ rows = [], headers = [], mapping = {}, sampleSize = 10 }) {
  const sampleRows = rows.slice(0, sampleSize);
  const columns = headers.length
    ? headers
    : Array.from(
        sampleRows.reduce((set, row) => {
          Object.keys(row || {}).forEach((key) => set.add(key));
          return set;
        }, new Set())
      );

  return columns.map((column) => {
    const values = sampleRows
      .map((row) => row?.[column])
      .filter((value) => !isBlank(value));

    const nonEmptyCount = values.length;
    const numericCount = values.filter((value) => toNumber(value) !== null).length;
    const dateCount = values.filter((value) => toDate(value) !== null).length;

    let detectedType = "string";
    if (nonEmptyCount > 0) {
      const numericRatio = numericCount / nonEmptyCount;
      const dateRatio = dateCount / nonEmptyCount;
      if (numericRatio >= 0.7) detectedType = "number";
      else if (dateRatio >= 0.7) detectedType = "date";
    }

    const distinctCount = new Set(values.map(normalizeDistinctValue)).size;
    const distinctRatio = nonEmptyCount > 0 ? distinctCount / nonEmptyCount : 1;

    const mappedTo = mapping[column] && mapping[column] !== "ignore" ? mapping[column] : null;

    return {
      name: column,
      detectedType,
      mappedTo,
      isNumeric: detectedType === "number",
      isCategorical: nonEmptyCount > 0 ? distinctRatio <= 0.5 : false,
    };
  });
}

module.exports = {
  isBlank,
  toNumber,
  toDate,
  toTrimmedString,
  normalizeRows,
  detectColumnsMetadata,
};
