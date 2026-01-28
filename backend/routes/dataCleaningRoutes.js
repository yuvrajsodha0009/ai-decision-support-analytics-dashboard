const express = require("express");
const {
  upload,
  cleanBatchData,
  exportPDF,
  exportExcel,
  getCleanedBatches,
  getCleanData,
  validateFieldValue,
  detectDataDuplicates,
  detectMissingData,
  getDataQualityReport,
  deduplicateData,
  normalizeData,
} = require("../controllers/dataCleaningController");

const router = express.Router();

// Data cleaning and processing
router.post("/clean", upload.single("file"), cleanBatchData);
router.get("/export/pdf", exportPDF);
router.get("/export/excel", exportExcel);
router.get("/cleaned-batches", getCleanedBatches);
router.get("/clean-data", getCleanData);

// ✅ Real-time validation
router.post("/validate-field", validateFieldValue);

// ✅ Duplicate detection and removal
router.post("/detect-duplicates", detectDataDuplicates);
router.post("/deduplicate", deduplicateData);

// ✅ Missing value detection
router.post("/detect-missing", detectMissingData);

// ✅ Data quality report
router.get("/quality-report", getDataQualityReport);

// ✅ Numeric normalization (0-1 range, min-max)
router.post("/normalize", normalizeData);

module.exports = router;
