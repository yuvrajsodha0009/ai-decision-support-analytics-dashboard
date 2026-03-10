// Controller orchestration layer for CSV v2: coordinates parsing, validation, normalization, dedupe, persistence, and analytics queries.
const fs = require("fs");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Source = require("../models/Source");
const Dataset = require("../models/Dataset");
const BusinessRecord = require("../models/BusinessRecord");
const MappingTemplate = require("../models/MappingTemplate");

const { parseHeadersAndSample, parseAllRows } = require("../Services/csvParserService");
const {
  STANDARD_FIELDS,
  IGNORE_TARGET,
  normalizeMapping,
  createHeaderSignature,
  suggestMappingFromHeaders,
} = require("../Services/mappingService");
const { detectDuplicateRows } = require("../Services/duplicateService");
const { normalizeRows, detectColumnsMetadata } = require("../Services/normalizationService");
const { validateRows } = require("../Services/validationService");
const { getCsvAnalyticsSummary } = require("../Services/csvAnalyticsService");

const SESSION_TTL_MS = 30 * 60 * 1000;
const SESSION_CLEANUP_MS = 5 * 60 * 1000;
const INSERT_CHUNK_SIZE = 1000;
const SOURCE_TYPES = new Set(["sales", "inventory", "customer", "custom"]);
const uploadSessions = new Map();

function safeDelete(filePath) {
  if (!filePath) return;
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of uploadSessions.entries()) {
    if (session.expiresAt <= now) {
      safeDelete(session.filePath);
      uploadSessions.delete(sessionId);
    }
  }
}

setInterval(cleanupExpiredSessions, SESSION_CLEANUP_MS).unref();

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return fallback;
}

function parseMaybeObject(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_error) {
      // Fall through to explicit validation error.
    }
  }

  const error = new Error("Invalid object payload");
  error.status = 400;
  throw error;
}

function parseMaybeArray(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_error) {
      // Fallback to comma-separated parser.
    }
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const error = new Error("Invalid array payload");
  error.status = 400;
  throw error;
}

function parseRequiredFields(rawRequiredFields) {
  const values = parseMaybeArray(rawRequiredFields).map((item) =>
    String(item || "").trim().toLowerCase()
  );

  const uniqueValues = Array.from(new Set(values.filter(Boolean)));
  for (const field of uniqueValues) {
    if (!STANDARD_FIELDS.includes(field)) {
      const error = new Error(`Invalid required field: ${field}`);
      error.status = 400;
      throw error;
    }
  }

  return uniqueValues;
}

function parseSourceType(rawValue) {
  const sourceType = String(rawValue || "").trim().toLowerCase();
  if (!SOURCE_TYPES.has(sourceType)) {
    const error = new Error("sourceType must be one of sales, inventory, customer, custom");
    error.status = 400;
    throw error;
  }
  return sourceType;
}

function parseObjectId(rawValue, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(rawValue)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.status = 400;
    throw error;
  }
  return new mongoose.Types.ObjectId(rawValue);
}

function serializeMapping(mapping) {
  return Object.keys(mapping)
    .sort()
    .reduce((acc, key) => {
      acc[key] = mapping[key];
      return acc;
    }, {});
}

function createValidationCacheKey(mapping, requiredFields) {
  const serializedPayload = JSON.stringify({
    mapping: serializeMapping(mapping),
    requiredFields: [...requiredFields].sort(),
  });
  return crypto.createHash("sha256").update(serializedPayload).digest("hex");
}

function ensureRequiredFieldsAreMapped(requiredFields, mapping) {
  const mappedTargets = new Set(
    Object.values(mapping || {}).filter((target) => target && target !== IGNORE_TARGET)
  );

  for (const field of requiredFields) {
    if (!mappedTargets.has(field)) {
      const error = new Error(`Required field "${field}" is not mapped`);
      error.status = 400;
      throw error;
    }
  }
}

function getRecordFilters(query, { defaultActiveOnly = true } = {}) {
  const filter = {};
  if (query.sourceId) {
    filter.sourceId = parseObjectId(query.sourceId, "sourceId");
  }
  if (query.datasetId) {
    filter.datasetId = parseObjectId(query.datasetId, "datasetId");
  }

  const includeInactive = parseBoolean(query.includeInactive, false);
  if (defaultActiveOnly && !includeInactive) {
    filter.isActive = true;
  }

  return { filter, includeInactive };
}

async function resolveSourceFromPayload(payload) {
  if (payload.sourceId) {
    const sourceId = parseObjectId(payload.sourceId, "sourceId");
    const source = await Source.findById(sourceId);
    if (!source) {
      const error = new Error("Source not found");
      error.status = 404;
      throw error;
    }
    return source;
  }

  const sourceName = String(payload.sourceName || "").trim();
  if (!sourceName) {
    const error = new Error("sourceName is required when sourceId is not provided");
    error.status = 400;
    throw error;
  }

  const sourceType = parseSourceType(payload.sourceType);
  return Source.findOneAndUpdate(
    { sourceName, sourceType },
    { $setOnInsert: { sourceName, sourceType } },
    { new: true, upsert: true }
  );
}

async function resolveSourceForTemplateLookup(payload) {
  if (payload.sourceId) {
    const sourceId = parseObjectId(payload.sourceId, "sourceId");
    return Source.findById(sourceId);
  }

  const sourceName = String(payload.sourceName || "").trim();
  const sourceTypeRaw = String(payload.sourceType || "").trim();
  if (!sourceName || !sourceTypeRaw) return null;

  const sourceType = parseSourceType(sourceTypeRaw);
  return Source.findOne({ sourceName, sourceType });
}

function resolveMappingForSession(rawMapping, session) {
  let mappingInput = parseMaybeObject(rawMapping);

  if (
    (!mappingInput || !Object.keys(mappingInput).length) &&
    session.autoMappedFields &&
    Object.keys(session.autoMappedFields).length
  ) {
    mappingInput = session.autoMappedFields;
  }

  if (!mappingInput || !Object.keys(mappingInput).length) {
    const error = new Error("Mapping is required");
    error.status = 400;
    throw error;
  }

  return normalizeMapping(mappingInput, session.headers);
}

function requireActiveSession(uploadSessionId) {
  const session = uploadSessions.get(uploadSessionId);
  if (!session) {
    const error = new Error("Upload session not found or expired");
    error.status = 410;
    throw error;
  }

  if (session.expiresAt <= Date.now()) {
    safeDelete(session.filePath);
    uploadSessions.delete(uploadSessionId);
    const error = new Error("Upload session expired");
    error.status = 410;
    throw error;
  }

  return session;
}

async function runValidationSnapshot({ session, mapping, requiredFields }) {
  const rows = await parseAllRows(session.filePath);
  const duplicateInfo = detectDuplicateRows(rows);
  const normalizedRows = normalizeRows({
    rows,
    mapping,
    rowHashes: duplicateInfo.rowHashes,
  });

  const columnsMetadata = detectColumnsMetadata({
    rows,
    headers: session.headers,
    mapping,
    sampleSize: 10,
  });

  const validation = validateRows({
    normalizedRows,
    requiredFields,
    duplicateRowIndexes: duplicateInfo.duplicateRowIndexes,
  });

  const report = {
    validRows: validation.validEntries.length,
    invalidRows: validation.invalidEntries.length,
    emptyRows: validation.emptyRows,
    duplicatesInFile: duplicateInfo.duplicateCount,
    errors: validation.errors,
    normalizationWarnings: validation.normalizationWarnings,
    columnsMetadata,
  };

  return {
    report,
    validation,
  };
}

async function getValidationSnapshot({ session, mapping, requiredFields }) {
  const cacheKey = createValidationCacheKey(mapping, requiredFields);
  if (session.validationCache && session.validationCache.key === cacheKey) {
    return session.validationCache.payload;
  }

  const payload = await runValidationSnapshot({ session, mapping, requiredFields });
  session.validationCache = {
    key: cacheKey,
    cachedAt: Date.now(),
    payload,
  };
  return payload;
}

async function insertBusinessRecordsInChunks(docs) {
  let inserted = 0;
  let duplicateKeyErrors = 0;

  for (let start = 0; start < docs.length; start += INSERT_CHUNK_SIZE) {
    const chunk = docs.slice(start, start + INSERT_CHUNK_SIZE);
    if (!chunk.length) continue;

    try {
      const insertedDocs = await BusinessRecord.insertMany(chunk, { ordered: false });
      inserted += insertedDocs.length;
    } catch (error) {
      const writeErrors = Array.isArray(error?.writeErrors) ? error.writeErrors : [];
      const duplicateErrors = writeErrors.filter((item) => item?.code === 11000).length;
      const nonDuplicateErrors = writeErrors.filter((item) => item?.code !== 11000);

      duplicateKeyErrors += duplicateErrors;
      if (Array.isArray(error?.insertedDocs)) {
        inserted += error.insertedDocs.length;
      }

      // If any non-duplicate write error exists, fail loudly.
      if (!writeErrors.length || nonDuplicateErrors.length > 0) {
        throw error;
      }
    }
  }

  return { inserted, duplicateKeyErrors };
}

exports.initUploadSession = async (req, res) => {
  cleanupExpiredSessions();

  if (!req.file) {
    return res.status(400).json({ message: "CSV file is required" });
  }

  try {
    const { headers, sampleRows } = await parseHeadersAndSample(req.file.path, 5);
    if (!headers.length) {
      safeDelete(req.file.path);
      return res.status(400).json({ message: "CSV has no headers" });
    }

    const suggestions = suggestMappingFromHeaders(headers);
    const headerSignature = createHeaderSignature(headers);
    const sourceForTemplate = await resolveSourceForTemplateLookup(req.body);

    let templateMatched = false;
    let autoMappedFields = {};
    if (sourceForTemplate) {
      const matchedTemplate = await MappingTemplate.findOne({
        sourceId: sourceForTemplate._id,
        headerSignature,
      }).lean();

      if (matchedTemplate?.mappedFields) {
        templateMatched = true;
        autoMappedFields = matchedTemplate.mappedFields;
      }
    }

    const uploadSessionId = crypto.randomUUID();
    const expiresAt = Date.now() + SESSION_TTL_MS;

    uploadSessions.set(uploadSessionId, {
      filePath: req.file.path,
      fileName: req.file.originalname,
      headers,
      headerSignature,
      suggestions,
      templateMatched,
      autoMappedFields,
      expiresAt,
      validationCache: null,
    });

    return res.json({
      uploadSessionId,
      fileName: req.file.originalname,
      headers,
      sampleRows,
      suggestions,
      templateMatched,
      autoMappedFields,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    safeDelete(req.file.path);
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to initialize upload session",
      error: error.status ? undefined : error.message,
    });
  }
};

exports.validateUploadSession = async (req, res) => {
  cleanupExpiredSessions();

  try {
    const uploadSessionId = String(req.body.uploadSessionId || "").trim();
    if (!uploadSessionId) {
      return res.status(400).json({ message: "uploadSessionId is required" });
    }

    const session = requireActiveSession(uploadSessionId);
    const mapping = resolveMappingForSession(req.body.mapping, session);
    const requiredFields = parseRequiredFields(req.body.requiredFields);
    ensureRequiredFieldsAreMapped(requiredFields, mapping);

    // Parsed for forward-compatibility of validation policy controls.
    parseBoolean(req.body.allowInvalidRows, false);

    const snapshot = await getValidationSnapshot({ session, mapping, requiredFields });
    return res.json(snapshot.report);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to validate upload session",
      error: error.status ? undefined : error.message,
    });
  }
};

exports.commitUploadSession = async (req, res) => {
  cleanupExpiredSessions();

  try {
    const uploadSessionId = String(req.body.uploadSessionId || "").trim();
    if (!uploadSessionId) {
      return res.status(400).json({ message: "uploadSessionId is required" });
    }

    const session = requireActiveSession(uploadSessionId);
    const mapping = resolveMappingForSession(req.body.mapping, session);
    const requiredFields = parseRequiredFields(req.body.requiredFields);
    const allowInvalidRows = parseBoolean(req.body.allowInvalidRows, false);
    ensureRequiredFieldsAreMapped(requiredFields, mapping);

    const snapshot = await getValidationSnapshot({ session, mapping, requiredFields });
    const source = await resolveSourceFromPayload(req.body);

    const dataset = await Dataset.create({
      sourceId: source._id,
      fileName: session.fileName,
      originalColumns: session.headers,
      mappedFields: mapping,
      recordCount: 0,
      columnsMetadata: snapshot.report.columnsMetadata,
      isActive: true,
      deletedAt: null,
    });

    const batchId = crypto.randomUUID();
    const uploadedAt = new Date();

    const rowsForInsert = allowInvalidRows
      ? [
          ...snapshot.validation.validEntries,
          ...snapshot.validation.invalidEntries.filter((entry) => !entry.isEmptyRow),
        ]
      : snapshot.validation.validEntries;

    const docs = rowsForInsert.map((entry) => ({
      sourceId: source._id,
      datasetId: dataset._id,
      date: entry.normalizedRecord.date,
      revenue: entry.normalizedRecord.revenue,
      quantity: entry.normalizedRecord.quantity,
      product: entry.normalizedRecord.product,
      customer: entry.normalizedRecord.customer,
      region: entry.normalizedRecord.region,
      extraFields: entry.normalizedRecord.extraFields,
      rawData: entry.normalizedRecord.rawData,
      batchId,
      rowHash: entry.rowHash,
      uploadedAt,
      isActive: true,
      deletedAt: null,
    }));

    const insertResult = await insertBusinessRecordsInChunks(docs);
    const duplicatesSkipped = snapshot.report.duplicatesInFile + insertResult.duplicateKeyErrors;
    const invalidRowsSkipped = allowInvalidRows ? 0 : snapshot.report.invalidRows;

    await Dataset.findByIdAndUpdate(dataset._id, {
      recordCount: insertResult.inserted,
    });

    await MappingTemplate.findOneAndUpdate(
      {
        sourceId: source._id,
        headerSignature: session.headerSignature,
      },
      {
        sourceId: source._id,
        originalColumns: session.headers,
        mappedFields: mapping,
        headerSignature: session.headerSignature,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    safeDelete(session.filePath);
    uploadSessions.delete(uploadSessionId);

    return res.status(201).json({
      sourceId: source._id,
      datasetId: dataset._id,
      batchId,
      recordCount: insertResult.inserted,
      inserted: insertResult.inserted,
      duplicatesSkipped,
      invalidRowsSkipped,
      validationReport: snapshot.report,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to commit CSV upload",
      error: error.status ? undefined : error.message,
    });
  }
};

exports.listSources = async (_req, res) => {
  try {
    const sources = await Source.find().sort({ createdAt: -1 }).lean();
    return res.json(sources);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch sources", error: error.message });
  }
};

exports.listDatasets = async (req, res) => {
  try {
    const filter = {};

    if (req.query.sourceId) {
      filter.sourceId = parseObjectId(req.query.sourceId, "sourceId");
    }

    const includeInactive = parseBoolean(req.query.includeInactive, false);
    if (!includeInactive) {
      filter.isActive = true;
    }

    const datasets = await Dataset.find(filter).sort({ uploadDate: -1 }).lean();
    return res.json(datasets);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to fetch datasets",
      error: error.status ? undefined : error.message,
    });
  }
};

exports.listBusinessRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "100", 10), 1), 500);
    const skip = (page - 1) * limit;

    const { filter } = getRecordFilters(req.query, { defaultActiveOnly: true });

    const [records, total] = await Promise.all([
      BusinessRecord.find(filter).sort({ uploadedAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      BusinessRecord.countDocuments(filter),
    ]);

    return res.json({
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to fetch records",
      error: error.status ? undefined : error.message,
    });
  }
};

exports.softDeleteDataset = async (req, res) => {
  try {
    const datasetId = parseObjectId(req.params.id, "dataset id");
    const deletedAt = new Date();

    const dataset = await Dataset.findByIdAndUpdate(
      datasetId,
      { isActive: false, deletedAt },
      { new: true }
    );

    if (!dataset) {
      return res.status(404).json({ message: "Dataset not found" });
    }

    await BusinessRecord.updateMany(
      { datasetId },
      {
        $set: {
          isActive: false,
          deletedAt,
        },
      }
    );

    return res.json({
      message: "Dataset soft deleted",
      datasetId: dataset._id,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to delete dataset",
      error: error.status ? undefined : error.message,
    });
  }
};

exports.restoreDataset = async (req, res) => {
  try {
    const datasetId = parseObjectId(req.params.id, "dataset id");

    const dataset = await Dataset.findByIdAndUpdate(
      datasetId,
      { isActive: true, deletedAt: null },
      { new: true }
    );

    if (!dataset) {
      return res.status(404).json({ message: "Dataset not found" });
    }

    await BusinessRecord.updateMany(
      { datasetId },
      {
        $set: {
          isActive: true,
          deletedAt: null,
        },
      }
    );

    return res.json({
      message: "Dataset restored",
      datasetId: dataset._id,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to restore dataset",
      error: error.status ? undefined : error.message,
    });
  }
};

exports.getAnalyticsSummary = async (req, res) => {
  try {
    const { filter } = getRecordFilters(req.query, { defaultActiveOnly: false });
    filter.isActive = true;

    const summary = await getCsvAnalyticsSummary(filter);
    return res.json(summary);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to fetch analytics summary",
      error: error.status ? undefined : error.message,
    });
  }
};
