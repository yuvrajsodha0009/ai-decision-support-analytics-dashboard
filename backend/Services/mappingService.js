// Mapping layer: validates one-to-one target mapping, suggests target fields, and creates header signatures for templates.
const STANDARD_FIELDS = ["date", "revenue", "quantity", "product", "customer", "region"];
const IGNORE_TARGET = "ignore";

const SUGGESTION_RULES = [
  { keywords: ["date"], target: "date" },
  { keywords: ["amount", "price", "value", "revenue"], target: "revenue" },
  { keywords: ["qty", "quantity", "units"], target: "quantity" },
  { keywords: ["customer", "client"], target: "customer" },
  { keywords: ["product", "item"], target: "product" },
  { keywords: ["region", "city", "state"], target: "region" },
];

function normalizeHeaderName(value) {
  return String(value || "").trim().toLowerCase();
}

function serializeHeaderForSignature(header) {
  return normalizeHeaderName(header).replace(/\s+/g, "_");
}

function createHeaderSignature(headers = []) {
  const normalized = headers
    .map(serializeHeaderForSignature)
    .filter(Boolean)
    .sort();

  return normalized.join("|");
}

function normalizeMapping(rawMapping, knownHeaders = []) {
  if (!rawMapping || typeof rawMapping !== "object" || Array.isArray(rawMapping)) {
    const error = new Error("Mapping must be an object");
    error.status = 400;
    throw error;
  }

  const mapping = {};
  const usedTargets = new Set();
  const knownHeaderSet = new Set(knownHeaders);

  for (const [column, rawTarget] of Object.entries(rawMapping)) {
    if (!column) continue;
    if (knownHeaderSet.size > 0 && !knownHeaderSet.has(column)) {
      const error = new Error(`Unknown mapping column: ${column}`);
      error.status = 400;
      throw error;
    }

    const target = normalizeHeaderName(rawTarget);
    if (!target || target === IGNORE_TARGET) {
      mapping[column] = IGNORE_TARGET;
      continue;
    }

    if (!STANDARD_FIELDS.includes(target)) {
      const error = new Error(`Invalid mapping target "${rawTarget}" for column "${column}"`);
      error.status = 400;
      throw error;
    }

    if (usedTargets.has(target)) {
      const error = new Error(`Duplicate mapping target "${target}" is not allowed`);
      error.status = 400;
      throw error;
    }

    usedTargets.add(target);
    mapping[column] = target;
  }

  return mapping;
}

function suggestMappingForHeader(header) {
  const normalizedHeader = normalizeHeaderName(header);
  if (!normalizedHeader) return IGNORE_TARGET;

  for (const rule of SUGGESTION_RULES) {
    if (rule.keywords.some((keyword) => normalizedHeader.includes(keyword))) {
      return rule.target;
    }
  }

  return IGNORE_TARGET;
}

function suggestMappingFromHeaders(headers = []) {
  const suggestions = {};
  for (const header of headers) {
    suggestions[header] = suggestMappingForHeader(header);
  }
  return suggestions;
}

module.exports = {
  STANDARD_FIELDS,
  IGNORE_TARGET,
  normalizeMapping,
  normalizeHeaderName,
  createHeaderSignature,
  suggestMappingFromHeaders,
};
