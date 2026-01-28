/**
 * Data Validation & Cleaning Utilities
 * Handles input validation, field restrictions, and data quality checks
 */

// Validation Rules Configuration
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Invalid email format",
  },
  phone: {
    pattern: /^\+?[\d\s\-()]{10,}$/,
    message: "Invalid phone number format",
  },
  date: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: "Invalid date format (use YYYY-MM-DD)",
  },
  url: {
    pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
    message: "Invalid URL format",
  },
  number: {
    pattern: /^-?\d+\.?\d*$/,
    message: "Must be a valid number",
  },
  currency: {
    pattern: /^[₹$€£]?\s*\d+(\.\d{2})?$/,
    message: "Invalid currency format",
  },
};

// Field Type Restrictions
const FIELD_TYPE_RULES = {
  string: (value) => typeof value === "string",
  number: (value) => !isNaN(value) && value !== "",
  boolean: (value) =>
    value === true || value === false || value === "true" || value === "false",
  email: (value) => VALIDATION_RULES.email.pattern.test(String(value)),
  phone: (value) => VALIDATION_RULES.phone.pattern.test(String(value)),
  date: (value) => {
    const parsed = new Date(value);
    return !isNaN(parsed.getTime()) || VALIDATION_RULES.date.pattern.test(String(value));
  },
  url: (value) => VALIDATION_RULES.url.pattern.test(String(value)),
  currency: (value) => VALIDATION_RULES.currency.pattern.test(String(value)),
};

/**
 * Validate individual field value against rules
 * @param {*} value - Field value to validate
 * @param {string} fieldType - Expected field type
 * @param {object} options - Additional validation options
 * @returns {object} { valid: boolean, error: string|null }
 */
const validateField = (value, fieldType = "string", options = {}) => {
  const { required = false, maxLength = null, minValue = null, maxValue = null } = options;

  // Check for missing/empty values
  if ((value === null || value === undefined || value === "") && required) {
    return { valid: false, error: "This field is required" };
  }

  // Allow empty values if not required
  if (!required && (value === null || value === undefined || value === "")) {
    return { valid: true, error: null };
  }

  // Type validation
  if (!FIELD_TYPE_RULES[fieldType] || !FIELD_TYPE_RULES[fieldType](value)) {
    const rule = VALIDATION_RULES[fieldType];
    const errorMsg = rule ? rule.message : `Invalid ${fieldType} format`;
    return { valid: false, error: errorMsg };
  }

  // String length validation
  if (fieldType === "string" && maxLength && String(value).length > maxLength) {
    return { valid: false, error: `Must be ${maxLength} characters or less` };
  }

  // Numeric range validation
  if ((fieldType === "number" || fieldType === "currency") && typeof value !== "string") {
    const numValue = parseFloat(value);
    if (minValue !== null && numValue < minValue) {
      return { valid: false, error: `Must be at least ${minValue}` };
    }
    if (maxValue !== null && numValue > maxValue) {
      return { valid: false, error: `Must be no more than ${maxValue}` };
    }
  }

  return { valid: true, error: null };
};

/**
 * Detect duplicates in dataset
 * @param {array} data - Array of data objects
 * @param {array} keyFields - Fields to check for duplicates
 * @returns {object} { duplicates: array, uniqueData: array }
 */
const detectDuplicates = (data, keyFields = []) => {
  if (!data || data.length === 0) {
    return { duplicates: [], uniqueData: [] };
  }

  const seen = new Map();
  const duplicates = [];
  const uniqueData = [];

  data.forEach((row, index) => {
    let key;

    if (keyFields.length > 0) {
      // Use specified key fields
      key = keyFields
        .map((field) => {
          const val = row[field];
          if (val === null || val === undefined) return "NULL";
          // Convert to string, trim, and lowercase for string comparison
          const strVal = String(val).trim();
          return isNaN(strVal) ? strVal.toLowerCase() : strVal;
        })
        .join("|");
    } else {
      // Use all fields for comparison
      key = Object.keys(row)
        .sort() // Sort keys for consistent ordering
        .map((field) => {
          const val = row[field];
          if (val === null || val === undefined) return "NULL";
          // Convert to string, trim, and handle case
          const strVal = String(val).trim();
          return isNaN(strVal) ? strVal.toLowerCase() : strVal;
        })
        .join("|");
    }

    if (seen.has(key)) {
      // This is a duplicate
      duplicates.push({
        rowIndex: index + 1,
        row: row,
        matchesRow: seen.get(key) + 1,
      });
    } else {
      // First occurrence, add to unique data
      seen.set(key, index);
      uniqueData.push(row);
    }
  });

  return { duplicates, uniqueData };
};

/**
 * Remove duplicate entries from dataset
 * @param {array} data - Array of data objects
 * @param {array} keyFields - Fields to check for duplicates
 * @returns {array} Unique data array
 */
const removeDuplicates = (data, keyFields = []) => {
  const { uniqueData } = detectDuplicates(data, keyFields);
  return uniqueData;
};

/**
 * Detect missing/null values in dataset
 * @param {array} data - Array of data objects
 * @returns {object} Missing value report
 */
const detectMissingValues = (data) => {
  const report = {
    totalRows: data.length,
    fieldsWithMissing: {},
    rowsWithMissing: [],
  };

  data.forEach((row, index) => {
    const missingFields = [];

    Object.entries(row).forEach(([field, value]) => {
      if (value === null || value === undefined || value === "" || value === "N/A") {
        if (!report.fieldsWithMissing[field]) {
          report.fieldsWithMissing[field] = { count: 0, percentage: 0 };
        }
        report.fieldsWithMissing[field].count++;
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      report.rowsWithMissing.push({
        rowIndex: index + 1,
        missingFields: missingFields,
      });
    }
  });

  // Calculate percentages
  Object.entries(report.fieldsWithMissing).forEach(([field, info]) => {
    info.percentage = ((info.count / report.totalRows) * 100).toFixed(2);
  });

  return report;
};

/**
 * Normalize numeric values to 0-1 range using min-max normalization
 * @param {array} data - Data array
 * @param {array} fieldsToNormalize - Fields to normalize (exclude IDs)
 * @returns {array} Data with normalized numeric values
 */
const normalizeNumericValues = (data, fieldsToNormalize = []) => {
  if (fieldsToNormalize.length === 0 || !data || data.length === 0) {
    return data;
  }

  // Find min and max for each field
  const minMax = {};
  
  fieldsToNormalize.forEach((field) => {
    const values = data
      .map((row) => {
        const val = row[field];
        return typeof val === "number" ? val : parseFloat(val);
      })
      .filter((val) => !isNaN(val));

    if (values.length > 0) {
      minMax[field] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }
  });

  // Normalize values
  return data.map((row) => {
    const normalizedRow = { ...row };

    fieldsToNormalize.forEach((field) => {
      if (minMax[field]) {
        const value = parseFloat(row[field]);
        if (!isNaN(value)) {
          const { min, max } = minMax[field];
          const range = max - min;
          
          // Min-max normalization: (x - min) / (max - min)
          normalizedRow[field] =
            range === 0 ? 0 : ((value - min) / range).toFixed(4);
        }
      }
    });

    return normalizedRow;
  });
};

/**
 * Clean and standardize data based on rules
 * @param {array} data - Raw data array
 * @param {object} fieldRules - Field validation rules
 * @param {object} options - Cleaning options { normalizeNumeric: bool, normalizeFields: [] }
 * @returns {object} { cleaned: array, errors: array, warnings: array }
 */
const cleanDataBatch = (data, fieldRules = {}, options = {}) => {
  const errors = [];
  const warnings = [];
  const cleaned = [];

  data.forEach((row, rowIndex) => {
    const cleanedRow = {};
    let rowHasErrors = false;

    Object.entries(row).forEach(([field, value]) => {
      const rule = fieldRules[field];

      if (!rule) {
        // No rules defined, just trim and clean basic formatting
        cleanedRow[field] = typeof value === "string" ? value.trim() : value;
        return;
      }

      const validation = validateField(value, rule.type, rule.options);

      if (!validation.valid) {
        errors.push({
          rowIndex: rowIndex + 1,
          field: field,
          value: value,
          error: validation.error,
        });
        rowHasErrors = true;
        cleanedRow[field] = null;
      } else {
        // Apply transformations
        let cleanedValue = value;

        if (typeof cleanedValue === "string") {
          cleanedValue = cleanedValue.trim();
        }

        if (rule.type === "email") {
          cleanedValue = cleanedValue.toLowerCase();
        }

        if (rule.type === "number" || rule.type === "currency") {
          cleanedValue = parseFloat(cleanedValue);
        }

        if (rule.type === "date") {
          cleanedValue = new Date(cleanedValue).toISOString().split("T")[0];
        }

        cleanedRow[field] = cleanedValue;
      }
    });

    if (!rowHasErrors) {
      cleaned.push(cleanedRow);
    } else {
      warnings.push(`Row ${rowIndex + 1} has validation errors`);
    }
  });

  // Apply numeric normalization if enabled
  if (options.normalizeNumeric && options.normalizeFields && options.normalizeFields.length > 0) {
    return {
      cleaned: normalizeNumericValues(cleaned, options.normalizeFields),
      errors,
      warnings,
    };
  }

  return { cleaned, errors, warnings };
};

/**
 * Generate data quality report
 * @param {array} data - Data array to analyze
 * @param {object} fieldRules - Field validation rules
 * @returns {object} Comprehensive quality report
 */
const generateQualityReport = (data, fieldRules = {}) => {
  const missingReport = detectMissingValues(data);
  const { duplicates, uniqueData } = detectDuplicates(data);
  const { errors: validationErrors } = cleanDataBatch(data, fieldRules);

  return {
    summary: {
      totalRecords: data.length,
      uniqueRecords: uniqueData.length,
      duplicateRecords: duplicates.length,
      validationErrors: validationErrors.length,
      completeness: `${(((data.length - missingReport.rowsWithMissing.length) / data.length) * 100).toFixed(2)}%`,
    },
    missingValues: missingReport,
    duplicates: duplicates,
    validationErrors: validationErrors,
    recommendations: generateRecommendations(
      missingReport,
      duplicates,
      validationErrors,
      data.length
    ),
  };
};

/**
 * Generate data cleaning recommendations
 */
const generateRecommendations = (missingReport, duplicates, errors, totalRecords) => {
  const recommendations = [];

  if (missingReport.rowsWithMissing.length > 0) {
    const missingPercentage = (
      (missingReport.rowsWithMissing.length / totalRecords) * 100
    ).toFixed(2);
    recommendations.push({
      type: "Missing Data",
      severity: missingPercentage > 20 ? "High" : "Medium",
      message: `${missingPercentage}% of rows have missing values. Consider imputation or removal.`,
    });
  }

  if (duplicates.length > 0) {
    const dupPercentage = ((duplicates.length / totalRecords) * 100).toFixed(2);
    recommendations.push({
      type: "Duplicates",
      severity: dupPercentage > 10 ? "High" : "Medium",
      message: `Found ${duplicates.length} duplicate records (${dupPercentage}%). Consider deduplication.`,
    });
  }

  if (errors.length > 0) {
    recommendations.push({
      type: "Validation Errors",
      severity: "High",
      message: `${errors.length} validation errors found. Review field formats and types.`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: "Data Quality",
      severity: "Low",
      message: "Data appears to be clean and well-formatted!",
    });
  }

  return recommendations;
};

module.exports = {
  VALIDATION_RULES,
  FIELD_TYPE_RULES,
  validateField,
  detectDuplicates,
  removeDuplicates,
  detectMissingValues,
  cleanDataBatch,
  generateQualityReport,
  normalizeNumericValues,
};
