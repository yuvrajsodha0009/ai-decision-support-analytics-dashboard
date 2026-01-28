import axios from "axios";

const API_BASE = "http://localhost:5000/api";

/**
 * Real-time field validation service
 */
export const validationApi = {
  /**
   * Validate a single field value in real-time
   */
  validateField: async (value, fieldType, options = {}) => {
    try {
      const res = await axios.post(`${API_BASE}/data-cleaning/validate-field`, {
        value,
        fieldType,
        options,
      });
      return res.data;
    } catch (error) {
      console.error("Validation error:", error);
      return { valid: false, error: "Validation service unavailable" };
    }
  },

  /**
   * Detect duplicates in uploaded data
   */
  detectDuplicates: async (keyFields = []) => {
    try {
      const res = await axios.post(`${API_BASE}/data-cleaning/detect-duplicates`, {
        keyFields,
      });
      return res.data;
    } catch (error) {
      console.error("Duplicate detection error:", error);
      throw error;
    }
  },

  /**
   * Remove duplicates from data
   */
  deduplicateData: async (keyFields = []) => {
    try {
      const res = await axios.post(`${API_BASE}/data-cleaning/deduplicate`, {
        keyFields: keyFields && keyFields.length > 0 ? keyFields : [],
      });
      return res.data;
    } catch (error) {
      console.error("Deduplication error:", error);
      throw error;
    }
  },

  /**
   * Detect missing values in data
   */
  detectMissingValues: async () => {
    try {
      const res = await axios.post(`${API_BASE}/data-cleaning/detect-missing`);
      return res.data;
    } catch (error) {
      console.error("Missing value detection error:", error);
      throw error;
    }
  },

  /**
   * Get data quality report
   */
  getQualityReport: async () => {
    try {
      const res = await axios.get(`${API_BASE}/data-cleaning/quality-report`);
      return res.data;
    } catch (error) {
      console.error("Quality report error:", error);
      throw error;
    }
  },

  /**
   * Upload and clean data with validation
   */
  cleanData: async (file, fieldRules = {}, removeDuplicates = false, normalizeNumeric = false, normalizeFields = []) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fieldRules", JSON.stringify(fieldRules));
      formData.append("removeDuplicates", removeDuplicates);
      formData.append("normalizeNumeric", normalizeNumeric);
      formData.append("normalizeFields", JSON.stringify(normalizeFields));

      const res = await axios.post(`${API_BASE}/data-cleaning/clean`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (error) {
      console.error("Data cleaning error:", error);
      throw error;
    }
  },

  /**
   * Normalize numeric values to 0-1 range
   */
  normalizeNumericValues: async (fieldsToNormalize = []) => {
    try {
      if (!fieldsToNormalize || fieldsToNormalize.length === 0) {
        throw new Error("Please select fields to normalize");
      }

      const res = await axios.post(`${API_BASE}/data-cleaning/normalize`, {
        fieldsToNormalize,
      });
      return res.data;
    } catch (error) {
      console.error("Normalization error:", error);
      throw error;
    }
  },
};

/**
 * Client-side validation helpers
 */
export const clientValidation = {
  /**
   * Validate email format
   */
  isValidEmail: (email) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  },

  /**
   * Validate phone number
   */
  isValidPhone: (phone) => {
    const pattern = /^\+?[\d\s\-()]{10,}$/;
    return pattern.test(phone);
  },

  /**
   * Validate date format (YYYY-MM-DD)
   */
  isValidDate: (date) => {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    return pattern.test(date) && !isNaN(new Date(date).getTime());
  },

  /**
   * Validate URL format
   */
  isValidUrl: (url) => {
    const pattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return pattern.test(url);
  },

  /**
   * Validate number format
   */
  isValidNumber: (num) => {
    return !isNaN(num) && num !== "";
  },

  /**
   * Check for empty/missing value
   */
  isEmpty: (value) => {
    return value === null || value === undefined || value === "";
  },

  /**
   * Validate string length
   */
  isValidLength: (str, min = 1, max = Infinity) => {
    const len = String(str).length;
    return len >= min && len <= max;
  },

  /**
   * Validate number range
   */
  isInRange: (num, min, max) => {
    const n = parseFloat(num);
    return n >= min && n <= max;
  },

  /**
   * Get validation error message
   */
  getErrorMessage: (fieldType, value = "") => {
    const messages = {
      email: "Please enter a valid email address",
      phone: "Please enter a valid phone number (10+ digits)",
      date: "Please enter a date in YYYY-MM-DD format",
      url: "Please enter a valid URL",
      number: "Please enter a valid number",
      currency: "Please enter a valid currency amount",
      required: "This field is required",
    };
    return messages[fieldType] || `Invalid ${fieldType}`;
  },
};

export default validationApi;
