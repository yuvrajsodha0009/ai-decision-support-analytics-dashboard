const multer = require("multer");
const Papa = require("papaparse");
const xlsx = require("xlsx");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const {
  validateField,
  detectDuplicates,
  removeDuplicates,
  detectMissingValues,
  cleanDataBatch,
  generateQualityReport,
  normalizeNumericValues,
} = require("../utils/dataValidation");
const logActivity = require("../utils/logActivity");

// In-memory storage for cleaned data (for demo)
let cleanedDataStore = [];
let dataQualityReport = {};

// Multer setup
const upload = multer({ dest: "uploads/" });

// ✅ Advanced Data Cleaning with Validation
const cleanBatchData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const fieldRules = req.body.fieldRules ? JSON.parse(req.body.fieldRules) : {};
    const removeDups = req.body.removeDuplicates === "true";
    const normalizeNumeric = req.body.normalizeNumeric === "true";
    const normalizeFields = req.body.normalizeFields ? JSON.parse(req.body.normalizeFields) : [];

    let rawData = [];

    // ✅ Parse based on file type with error handling
    try {
      if (fileExt === ".csv" || fileExt === ".txt") {
        const csvFile = fs.readFileSync(filePath, "utf8");
        const parsed = Papa.parse(csvFile, { header: true, skipEmptyLines: true });
        rawData = parsed.data.filter((row) => Object.values(row).some((v) => v !== ""));
      } else if (fileExt === ".xlsx" || fileExt === ".xls") {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else if (fileExt === ".json") {
        const jsonFile = fs.readFileSync(filePath, "utf8");
        rawData = JSON.parse(jsonFile);
        if (!Array.isArray(rawData)) {
          rawData = [rawData];
        }
      } else {
        return res.status(400).json({ error: "Unsupported file type. Use CSV, Excel, or JSON." });
      }
    } catch (parseError) {
      return res.status(400).json({ error: `Failed to parse file: ${parseError.message}` });
    }

    if (rawData.length === 0) {
      return res.status(400).json({ error: "File is empty or contains no valid data" });
    }

    // ✅ Detect missing values before cleaning
    const missingReport = detectMissingValues(rawData);

    // ✅ Detect duplicates before cleaning
    const { duplicates, uniqueData } = detectDuplicates(rawData);

    // ✅ Clean data with validation
    const { cleaned, errors: validationErrors, warnings } = cleanDataBatch(
      removeDups ? uniqueData : rawData,
      fieldRules,
      { normalizeNumeric, normalizeFields }
    );

    // ✅ Generate quality report
    dataQualityReport = generateQualityReport(cleaned, fieldRules);

    // Store in memory
    cleanedDataStore = cleaned;

    // Delete uploaded file
    fs.unlinkSync(filePath);

    await logActivity(
      req.userId ? "User" : "System",
      "Data Cleaned",
      "Data Cleaning",
      `Processed ${rawData.length} rows, cleaned ${cleaned.length} rows`,
      "success",
      req
    );

    res.json({
      success: true,
      data: cleaned,
      stats: {
        originalRows: rawData.length,
        processedRows: cleaned.length,
        duplicatesFound: duplicates.length,
        validationErrors: validationErrors.length,
        rowsWithMissing: missingReport.rowsWithMissing.length,
        recordsRemoved: rawData.length - cleaned.length,
      },
      warnings: warnings,
      errors: validationErrors.slice(0, 10), // First 10 errors
      qualityReport: dataQualityReport,
    });
  } catch (error) {
    console.error("Data cleaning error:", error);
    res.status(500).json({ error: `Failed to clean data: ${error.message}` });
  }
};

// ✅ Export as PDF
const exportPDF = (req, res) => {
  try {
    const doc = new PDFDocument();
    const filename = `cleaned_data_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.fontSize(18).text("Cleaned Data Report", { align: "center" });
    doc.moveDown();

    cleanedDataStore.forEach((row, i) => {
      doc.fontSize(10).text(`Row ${i + 1}: ${JSON.stringify(row)}`);
      doc.moveDown(0.5);
    });

    doc.end();

    logActivity(
      req.userId ? "User" : "System",
      "Cleaned Data Exported",
      "Data Cleaning",
      "Exported cleaned data as PDF",
      "success",
      req
    );
  } catch (error) {
    console.error("PDF export error:", error);
    res.status(500).json({ error: "Failed to export PDF" });
  }
};

// ✅ Export as Excel
const exportExcel = (req, res) => {
  try {
    const ws = xlsx.utils.json_to_sheet(cleanedDataStore);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Cleaned Data");

    const filename = `cleaned_data_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, "../uploads", filename);

    xlsx.writeFile(wb, filePath);

    res.download(filePath, filename, (err) => {
      if (err) console.error(err);
      fs.unlinkSync(filePath); // Delete after download
    });

    logActivity(
      req.userId ? "User" : "System",
      "Cleaned Data Exported",
      "Data Cleaning",
      "Exported cleaned data as Excel",
      "success",
      req
    );
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ error: "Failed to export Excel" });
  }
};

// ✅ Get cleaned batches (placeholder)
const getCleanedBatches = (req, res) => {
  res.json({ batches: ["batch1", "batch2"], message: "Feature coming soon" });
};

// ✅ Get clean data
const getCleanData = (req, res) => {
  res.json(cleanedDataStore);
};

// ✅ Validate field value in real-time
const validateFieldValue = (req, res) => {
  try {
    const { value, fieldType, options } = req.body;

    if (!value || !fieldType) {
      return res.status(400).json({ error: "Missing value or fieldType" });
    }

    const validation = validateField(value, fieldType, options || {});

    res.json({
      valid: validation.valid,
      error: validation.error,
      fieldType: fieldType,
      value: value,
    });
  } catch (error) {
    console.error("Validation error:", error);
    res.status(500).json({ error: "Validation failed" });
  }
};

// ✅ Detect duplicates in dataset
const detectDataDuplicates = (req, res) => {
  try {
    if (cleanedDataStore.length === 0) {
      return res.status(400).json({ error: "No data available. Upload and clean data first." });
    }

    const keyFields = req.body.keyFields && req.body.keyFields.length > 0 ? req.body.keyFields : [];
    
    const { duplicates, uniqueData } = detectDuplicates(
      cleanedDataStore,
      keyFields
    );

    const result = {
      totalRecords: cleanedDataStore.length,
      uniqueRecords: uniqueData.length,
      duplicateCount: duplicates.length,
      duplicatePercentage: ((duplicates.length / cleanedDataStore.length) * 100).toFixed(2),
      duplicates: duplicates,
      keyFieldsUsed: keyFields.length > 0 ? keyFields : "All fields",
      message: duplicates.length === 0 
        ? "No duplicates found" 
        : `Found ${duplicates.length} duplicate record(s)`,
    };

    res.json(result);
  } catch (error) {
    console.error("Duplicate detection error:", error);
    res.status(500).json({ error: `Failed to detect duplicates: ${error.message}` });
  }
};

// ✅ Detect missing values in dataset
const detectMissingData = (req, res) => {
  try {
    if (cleanedDataStore.length === 0) {
      return res.status(400).json({ error: "No data available. Upload and clean data first." });
    }

    const report = detectMissingValues(cleanedDataStore);

    res.json(report);
  } catch (error) {
    console.error("Missing data detection error:", error);
    res.status(500).json({ error: "Failed to detect missing values" });
  }
};

// ✅ Get data quality report
const getDataQualityReport = (req, res) => {
  try {
    if (!dataQualityReport || Object.keys(dataQualityReport).length === 0) {
      return res.status(400).json({ error: "No quality report available. Clean data first." });
    }

    res.json(dataQualityReport);
  } catch (error) {
    console.error("Quality report error:", error);
    res.status(500).json({ error: "Failed to get quality report" });
  }
};

// ✅ Remove duplicates from current data
const deduplicateData = (req, res) => {
  try {
    if (cleanedDataStore.length === 0) {
      return res.status(400).json({ error: "No data available. Upload and clean data first." });
    }

    const keyFields = req.body.keyFields && req.body.keyFields.length > 0 ? req.body.keyFields : [];
    
    // Use the detectDuplicates to get unique data
    const { duplicates, uniqueData } = detectDuplicates(cleanedDataStore, keyFields);

    if (duplicates.length === 0) {
      return res.json({
        success: true,
        message: "No duplicates found",
        originalCount: cleanedDataStore.length,
        deduplicatedCount: cleanedDataStore.length,
        removedCount: 0,
        data: cleanedDataStore,
      });
    }

    const originalCount = cleanedDataStore.length;
    const removedCount = originalCount - uniqueData.length;

    // Update the store with deduplicated data
    cleanedDataStore = uniqueData;

    res.json({
      success: true,
      message: `Removed ${removedCount} duplicate record(s)`,
      originalCount: originalCount,
      deduplicatedCount: uniqueData.length,
      removedCount: removedCount,
      duplicatesRemoved: duplicates.length,
      data: uniqueData,
    });
  } catch (error) {
    console.error("Deduplication error:", error);
    res.status(500).json({ error: `Failed to deduplicate data: ${error.message}` });
  }
};

// ✅ Normalize numeric values in current data
const normalizeData = (req, res) => {
  try {
    if (cleanedDataStore.length === 0) {
      return res.status(400).json({ error: "No data available. Upload and clean data first." });
    }

    const { fieldsToNormalize } = req.body;

    if (!fieldsToNormalize || fieldsToNormalize.length === 0) {
      return res.status(400).json({ error: "Please specify fields to normalize" });
    }

    const normalized = normalizeNumericValues(cleanedDataStore, fieldsToNormalize);

    cleanedDataStore = normalized;

    res.json({
      success: true,
      message: `Normalized ${fieldsToNormalize.length} fields`,
      fieldsNormalized: fieldsToNormalize,
      data: normalized,
      note: "Values normalized to 0-1 range using min-max normalization",
    });
  } catch (error) {
    console.error("Normalization error:", error);
    res.status(500).json({ error: `Failed to normalize data: ${error.message}` });
  }
};

module.exports = {
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
};
