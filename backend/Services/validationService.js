// Validation layer: applies row-level required checks and aggregates a pre-commit validation report.

function isMissingRequired(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

function validateRows({ normalizedRows = [], requiredFields = [], duplicateRowIndexes = new Set() }) {
  const validEntries = [];
  const invalidEntries = [];
  const duplicateEntries = [];
  const errors = [];
  const normalizationWarnings = [];
  let emptyRows = 0;

  normalizedRows.forEach((entry) => {
    if (duplicateRowIndexes.has(entry.row)) {
      duplicateEntries.push(entry);
      return;
    }

    const rowErrors = [];

    if (entry.isEmptyRow) {
      emptyRows += 1;
      rowErrors.push({ row: entry.row, field: "row", issue: "Empty row" });
    }

    (entry.errors || []).forEach((item) => {
      rowErrors.push({
        row: entry.row,
        field: item.field,
        issue: item.issue,
      });
    });

    requiredFields.forEach((field) => {
      if (isMissingRequired(entry.mappedValues?.[field])) {
        rowErrors.push({
          row: entry.row,
          field,
          issue: "Required field missing",
        });
      }
    });

    const deduplicatedRowErrors = Array.from(
      new Map(rowErrors.map((item) => [`${item.field}|${item.issue}`, item])).values()
    );

    (entry.warnings || []).forEach((item) => {
      normalizationWarnings.push({
        row: entry.row,
        field: item.field,
        issue: item.issue,
      });
    });

    if (deduplicatedRowErrors.length > 0) {
      errors.push(...deduplicatedRowErrors);
      invalidEntries.push({
        ...entry,
        rowErrors: deduplicatedRowErrors,
      });
      return;
    }

    validEntries.push(entry);
  });

  return {
    validEntries,
    invalidEntries,
    duplicateEntries,
    emptyRows,
    errors,
    normalizationWarnings,
  };
}

module.exports = {
  validateRows,
};
