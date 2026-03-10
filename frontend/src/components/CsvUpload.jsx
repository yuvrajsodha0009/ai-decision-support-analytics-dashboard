
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api/v2/csv";

const SOURCE_TYPE_OPTIONS = ["sales", "inventory", "customer", "custom"];
const STANDARD_FIELDS = ["date", "revenue", "quantity", "product", "customer", "region"];
const MAPPING_OPTIONS = [
  { value: "ignore", label: "Ignore" },
  { value: "date", label: "Date" },
  { value: "revenue", label: "Revenue" },
  { value: "quantity", label: "Quantity" },
  { value: "product", label: "Product" },
  { value: "customer", label: "Customer" },
  { value: "region", label: "Region" },
];

const DEFAULT_SUMMARY = {
  totalRecords: 0,
  totalRevenue: null,
  totalUnits: null,
  uniqueCustomers: 0,
  hasRevenue: false,
  hasQuantity: false,
  hasCustomer: false,
};

function formatMetric(value) {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

function buildValidationSignature(mapping, requiredFields) {
  const mappingPairs = Object.keys(mapping || {})
    .sort()
    .map((key) => `${key}:${mapping[key]}`)
    .join("|");
  const required = [...(requiredFields || [])].sort().join("|");
  return `${mappingPairs}::${required}`;
}

const CsvUpload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isInitializing, setIsInitializing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isDeletingDataset, setIsDeletingDataset] = useState(false);
  const [isRestoringDataset, setIsRestoringDataset] = useState(false);

  const [uploadSessionId, setUploadSessionId] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const [templateMatched, setTemplateMatched] = useState(false);

  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState("sales");

  const [requiredFields, setRequiredFields] = useState([]);
  const [allowInvalidRows, setAllowInvalidRows] = useState(false);
  const [validationReport, setValidationReport] = useState(null);
  const [validationSignature, setValidationSignature] = useState("");

  const [sources, setSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState("all");
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("all");
  const [includeInactiveDatasets, setIncludeInactiveDatasets] = useState(false);

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset._id === selectedDatasetId) || null,
    [datasets, selectedDatasetId]
  );

  const currentValidationSignature = useMemo(
    () => buildValidationSignature(mapping, requiredFields),
    [mapping, requiredFields]
  );

  const rawColumns = useMemo(() => {
    const unique = new Set();
    records.forEach((record) => {
      Object.keys(record.rawData || {}).forEach((key) => unique.add(key));
    });
    return Array.from(unique);
  }, [records]);

  const duplicateMappings = useMemo(() => {
    const counts = {};
    Object.values(mapping).forEach((target) => {
      if (!target || target === "ignore") return;
      counts[target] = (counts[target] || 0) + 1;
    });
    return Object.keys(counts).filter((target) => counts[target] > 1);
  }, [mapping]);

  const hasDuplicateMappings = duplicateMappings.length > 0;

  useEffect(() => {
    setValidationReport(null);
    setValidationSignature("");
  }, [currentValidationSignature]);

  const fetchSources = async (preferredSourceId) => {
    try {
      const response = await axios.get(`${API_BASE}/sources`);
      const sourceRows = Array.isArray(response.data) ? response.data : [];
      setSources(sourceRows);

      setSelectedSourceId((previous) => {
        if (preferredSourceId && sourceRows.some((item) => item._id === preferredSourceId)) {
          return preferredSourceId;
        }
        if (previous !== "all" && sourceRows.some((item) => item._id === previous)) {
          return previous;
        }
        return "all";
      });
    } catch (error) {
      console.error("Failed to load sources", error);
      setErrorMessage("Failed to load sources");
    }
  };

  const fetchDatasets = async (sourceId, preferredDatasetId, includeInactive = includeInactiveDatasets) => {
    if (!sourceId || sourceId === "all") {
      setDatasets([]);
      setSelectedDatasetId("all");
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/datasets`, {
        params: {
          sourceId,
          includeInactive: includeInactive ? "true" : undefined,
        },
      });

      const datasetRows = Array.isArray(response.data) ? response.data : [];
      setDatasets(datasetRows);

      setSelectedDatasetId((previous) => {
        if (
          preferredDatasetId &&
          datasetRows.some((dataset) => dataset._id === preferredDatasetId)
        ) {
          return preferredDatasetId;
        }
        if (previous !== "all" && datasetRows.some((dataset) => dataset._id === previous)) {
          return previous;
        }
        return "all";
      });
    } catch (error) {
      console.error("Failed to load datasets", error);
      setErrorMessage("Failed to load datasets");
    }
  };

  const fetchRecords = async (sourceId = selectedSourceId, datasetId = selectedDatasetId, page = 1) => {
    setIsLoadingRecords(true);
    try {
      const params = { page, limit: pagination.limit || 50 };
      if (sourceId && sourceId !== "all") params.sourceId = sourceId;
      if (datasetId && datasetId !== "all") params.datasetId = datasetId;

      const response = await axios.get(`${API_BASE}/records`, { params });
      setRecords(Array.isArray(response.data?.records) ? response.data.records : []);
      setPagination(
        response.data?.pagination || {
          page,
          limit: 50,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (error) {
      console.error("Failed to load records", error);
      setErrorMessage("Failed to load records");
      setRecords([]);
      setPagination((previous) => ({ ...previous, total: 0, totalPages: 1 }));
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const fetchSummary = async (sourceId = selectedSourceId, datasetId = selectedDatasetId) => {
    try {
      const params = {};
      if (sourceId && sourceId !== "all") params.sourceId = sourceId;
      if (datasetId && datasetId !== "all") params.datasetId = datasetId;

      const response = await axios.get(`${API_BASE}/analytics/summary`, { params });
      setSummary({ ...DEFAULT_SUMMARY, ...(response.data || {}) });
    } catch (error) {
      console.error("Failed to load analytics summary", error);
      setErrorMessage("Failed to load analytics summary");
      setSummary(DEFAULT_SUMMARY);
    }
  };

  const handleInitUpload = async () => {
    setMessage("");
    setErrorMessage("");
    setValidationReport(null);
    setValidationSignature("");

    if (!file) {
      setErrorMessage("Select a CSV file first");
      return;
    }

    try {
      setIsInitializing(true);

      const formData = new FormData();
      formData.append("file", file);
      if (selectedSourceId !== "all") {
        formData.append("sourceId", selectedSourceId);
      } else if (sourceName.trim()) {
        formData.append("sourceName", sourceName.trim());
        formData.append("sourceType", sourceType);
      }

      const response = await axios.post(`${API_BASE}/uploads/init`, formData);
      const nextHeaders = Array.isArray(response.data?.headers) ? response.data.headers : [];
      const nextSuggestions =
        response.data?.suggestions && typeof response.data.suggestions === "object"
          ? response.data.suggestions
          : {};
      const nextAutoMapping =
        response.data?.autoMappedFields && typeof response.data.autoMappedFields === "object"
          ? response.data.autoMappedFields
          : {};
      const nextTemplateMatched = Boolean(response.data?.templateMatched);

      const initialMapping = {};
      nextHeaders.forEach((header) => {
        initialMapping[header] = "ignore";
      });

      if (nextTemplateMatched && Object.keys(nextAutoMapping).length) {
        Object.entries(nextAutoMapping).forEach(([column, target]) => {
          if (column in initialMapping) initialMapping[column] = target;
        });
      } else {
        nextHeaders.forEach((header) => {
          initialMapping[header] = nextSuggestions[header] || "ignore";
        });
      }

      setUploadSessionId(response.data?.uploadSessionId || "");
      setUploadedFileName(response.data?.fileName || file.name);
      setHeaders(nextHeaders);
      setSampleRows(Array.isArray(response.data?.sampleRows) ? response.data.sampleRows : []);
      setSuggestions(nextSuggestions);
      setTemplateMatched(nextTemplateMatched);
      setMapping(initialMapping);

      if (nextTemplateMatched) {
        setMessage("Headers parsed. Matching template found and mapping auto-applied.");
      } else {
        setMessage("Headers parsed. Suggestions applied; review mapping and validate.");
      }
    } catch (error) {
      console.error("Upload init failed", error);
      setErrorMessage(error.response?.data?.message || "Failed to initialize upload");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleValidateUpload = async () => {
    setMessage("");
    setErrorMessage("");

    if (!uploadSessionId) {
      setErrorMessage("Initialize upload first");
      return;
    }
    if (hasDuplicateMappings) {
      setErrorMessage("Duplicate standardized mapping targets are not allowed");
      return;
    }

    try {
      setIsValidating(true);
      const response = await axios.post(`${API_BASE}/uploads/validate`, {
        uploadSessionId,
        mapping,
        requiredFields,
        allowInvalidRows,
      });
      setValidationReport(response.data || null);
      setValidationSignature(currentValidationSignature);
      setMessage("Validation completed. Review report before commit.");
    } catch (error) {
      console.error("Validation failed", error);
      setErrorMessage(error.response?.data?.message || "Validation failed");
      setValidationReport(null);
      setValidationSignature("");
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommitUpload = async () => {
    setMessage("");
    setErrorMessage("");

    if (!uploadSessionId) {
      setErrorMessage("Initialize upload first");
      return;
    }
    if (hasDuplicateMappings) {
      setErrorMessage("Duplicate standardized mapping targets are not allowed");
      return;
    }

    if (!validationReport || validationSignature !== currentValidationSignature) {
      setErrorMessage("Run validation with current mapping before commit");
      return;
    }

    try {
      setIsCommitting(true);

      const payload = {
        uploadSessionId,
        mapping,
        requiredFields,
        allowInvalidRows,
      };

      if (selectedSourceId !== "all") {
        payload.sourceId = selectedSourceId;
      } else {
        payload.sourceName = sourceName.trim();
        payload.sourceType = sourceType;
      }

      const response = await axios.post(`${API_BASE}/uploads/commit`, payload);

      const nextSourceId = String(response.data?.sourceId || "");
      const nextDatasetId = String(response.data?.datasetId || "");
      const inserted = Number(response.data?.inserted || 0);
      const duplicatesSkipped = Number(response.data?.duplicatesSkipped || 0);
      const invalidRowsSkipped = Number(response.data?.invalidRowsSkipped || 0);

      setMessage(
        `Commit successful: inserted ${inserted}, duplicates skipped ${duplicatesSkipped}, invalid rows skipped ${invalidRowsSkipped}.`
      );

      setFile(null);
      setUploadSessionId("");
      setUploadedFileName("");
      setHeaders([]);
      setSampleRows([]);
      setMapping({});
      setSuggestions({});
      setTemplateMatched(false);
      setRequiredFields([]);
      setAllowInvalidRows(false);
      setValidationReport(null);
      setValidationSignature("");

      await fetchSources(nextSourceId);
      await fetchDatasets(nextSourceId, nextDatasetId, includeInactiveDatasets);
      await fetchRecords(nextSourceId, nextDatasetId, 1);
      await fetchSummary(nextSourceId, nextDatasetId);
    } catch (error) {
      console.error("Commit failed", error);
      setErrorMessage(error.response?.data?.message || "Failed to commit upload");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleSoftDeleteDataset = async () => {
    if (!selectedDataset || !selectedDataset._id) return;
    if (!window.confirm("Soft delete selected dataset and its records?")) return;

    try {
      setIsDeletingDataset(true);
      await axios.delete(`${API_BASE}/dataset/${selectedDataset._id}`);
      setMessage("Dataset soft deleted successfully.");

      await fetchDatasets(selectedSourceId, selectedDatasetId, true);
      await fetchRecords(selectedSourceId, selectedDatasetId, 1);
      await fetchSummary(selectedSourceId, selectedDatasetId);
    } catch (error) {
      console.error("Soft delete failed", error);
      setErrorMessage(error.response?.data?.message || "Failed to delete dataset");
    } finally {
      setIsDeletingDataset(false);
    }
  };

  const handleRestoreDataset = async () => {
    if (!selectedDataset || !selectedDataset._id) return;

    try {
      setIsRestoringDataset(true);
      await axios.post(`${API_BASE}/dataset/${selectedDataset._id}/restore`);
      setMessage("Dataset restored successfully.");

      await fetchDatasets(selectedSourceId, selectedDatasetId, includeInactiveDatasets);
      await fetchRecords(selectedSourceId, selectedDatasetId, 1);
      await fetchSummary(selectedSourceId, selectedDatasetId);
    } catch (error) {
      console.error("Restore failed", error);
      setErrorMessage(error.response?.data?.message || "Failed to restore dataset");
    } finally {
      setIsRestoringDataset(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    if (selectedSourceId === "all") {
      setDatasets([]);
      setSelectedDatasetId("all");
      fetchRecords("all", "all", 1);
      fetchSummary("all", "all");
      return;
    }

    fetchDatasets(selectedSourceId, undefined, includeInactiveDatasets);
    fetchRecords(selectedSourceId, "all", 1);
    fetchSummary(selectedSourceId, "all");
  }, [selectedSourceId, includeInactiveDatasets]);

  useEffect(() => {
    if (selectedSourceId === "all") return;
    fetchRecords(selectedSourceId, selectedDatasetId, 1);
    fetchSummary(selectedSourceId, selectedDatasetId);
  }, [selectedDatasetId]);

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    fetchRecords(selectedSourceId, selectedDatasetId, nextPage);
  };

  return (
    <div className="csv-page p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">CSV Ingestion V2</h1>
        <p className="text-slate-300 mt-2">
          Production validation, mapping templates, dedupe-safe commits, and lifecycle control.
        </p>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-emerald-100">
          {message}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Step 1: Parse CSV Headers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-300 mb-2">Source Name (for new source)</label>
            <input
              type="text"
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              placeholder="e.g. Sales North"
              className="w-full border border-white/20 bg-white/5 text-white rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Source Type</label>
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value)}
              className="w-full border border-white/20 bg-white/5 text-white rounded-lg px-3 py-2"
            >
              {SOURCE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-slate-900 text-white">
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="flex-1 min-w-[220px] border border-white/20 bg-white/5 text-slate-100 rounded-lg px-3 py-2"
          />
          <button
            onClick={handleInitUpload}
            disabled={isInitializing}
            className="px-5 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold disabled:opacity-50"
          >
            {isInitializing ? "Parsing..." : "Parse Headers"}
          </button>
        </div>

        {uploadSessionId ? (
          <p className="text-sm text-slate-300 mt-3">
            Active session for <span className="font-semibold">{uploadedFileName}</span>
          </p>
        ) : null}
        {templateMatched ? (
          <p className="text-sm text-emerald-200 mt-2">
            Mapping template matched and auto-applied.
          </p>
        ) : null}
      </div>

      {headers.length > 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Step 2: Mapping + Validation + Commit</h2>

          <div className="mb-4">
            <p className="text-sm text-slate-300 mb-2">Required mapped fields</p>
            <div className="flex flex-wrap gap-3">
              {STANDARD_FIELDS.map((field) => (
                <label key={field} className="text-sm text-slate-200 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={requiredFields.includes(field)}
                    onChange={() => {
                      setRequiredFields((previous) =>
                        previous.includes(field)
                          ? previous.filter((item) => item !== field)
                          : [...previous, field]
                      );
                    }}
                  />
                  {field}
                </label>
              ))}
            </div>
          </div>

          <label className="text-sm text-slate-200 flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={allowInvalidRows}
              onChange={(event) => setAllowInvalidRows(event.target.checked)}
            />
            Allow inserting invalid rows (null-normalized values)
          </label>

          {hasDuplicateMappings ? (
            <p className="mb-3 text-sm text-rose-200">
              Duplicate mapping targets: {duplicateMappings.join(", ")}
            </p>
          ) : null}

          <div className="overflow-x-auto overflow-y-auto max-h-[45vh]">
            <table className="min-w-full text-sm text-slate-100">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-300">
                  <th className="py-2 px-3">CSV Column</th>
                  <th className="py-2 px-3">Sample Value</th>
                  <th className="py-2 px-3">Suggestion</th>
                  <th className="py-2 px-3">Map To</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((header) => (
                  <tr key={header} className="border-t border-white/10">
                    <td className="py-2 px-3 font-medium">{header}</td>
                    <td className="py-2 px-3 text-slate-300">{sampleRows[0]?.[header] ?? "-"}</td>
                    <td className="py-2 px-3 text-cyan-200">{suggestions?.[header] || "ignore"}</td>
                    <td className="py-2 px-3">
                      <select
                        value={mapping[header] || "ignore"}
                        onChange={(event) =>
                          setMapping((previous) => ({
                            ...previous,
                            [header]: event.target.value,
                          }))
                        }
                        className="w-full border border-white/20 bg-white/5 text-white rounded-lg px-3 py-2"
                      >
                        {MAPPING_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleValidateUpload}
              disabled={isValidating || hasDuplicateMappings}
              className="px-5 py-2 rounded-lg bg-cyan-500 text-slate-900 font-semibold disabled:opacity-50"
            >
              {isValidating ? "Validating..." : "Validate Upload"}
            </button>
            <button
              onClick={handleCommitUpload}
              disabled={isCommitting || hasDuplicateMappings}
              className="px-5 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold disabled:opacity-50"
            >
              {isCommitting ? "Committing..." : "Commit Upload"}
            </button>
          </div>
        </div>
      ) : null}

      {validationReport ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Validation Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase text-slate-300">Valid Rows</p>
              <p className="text-lg font-semibold text-emerald-200">{validationReport.validRows || 0}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase text-slate-300">Invalid Rows</p>
              <p className="text-lg font-semibold text-rose-200">{validationReport.invalidRows || 0}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase text-slate-300">Empty Rows</p>
              <p className="text-lg font-semibold text-amber-200">{validationReport.emptyRows || 0}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase text-slate-300">Duplicates In File</p>
              <p className="text-lg font-semibold text-cyan-200">
                {validationReport.duplicatesInFile || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Errors</h3>
              <div className="max-h-48 overflow-y-auto text-xs text-slate-200">
                {(validationReport.errors || []).slice(0, 20).map((item, index) => (
                  <p key={`${item.row}-${item.field}-${index}`}>
                    Row {item.row} - {item.field}: {item.issue}
                  </p>
                ))}
                {(validationReport.errors || []).length === 0 ? <p>No errors</p> : null}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Normalization Warnings</h3>
              <div className="max-h-48 overflow-y-auto text-xs text-slate-200">
                {(validationReport.normalizationWarnings || []).slice(0, 20).map((item, index) => (
                  <p key={`${item.row}-${item.field}-${index}`}>
                    Row {item.row} - {item.field}: {item.issue}
                  </p>
                ))}
                {(validationReport.normalizationWarnings || []).length === 0 ? <p>No warnings</p> : null}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Column Metadata</h3>
            <table className="min-w-full text-xs text-slate-200">
              <thead>
                <tr className="text-left text-slate-300">
                  <th className="py-2 pr-3">Column</th>
                  <th className="py-2 pr-3">Detected Type</th>
                  <th className="py-2 pr-3">Mapped To</th>
                  <th className="py-2 pr-3">Numeric</th>
                  <th className="py-2 pr-3">Categorical</th>
                </tr>
              </thead>
              <tbody>
                {(validationReport.columnsMetadata || []).map((column) => (
                  <tr key={column.name} className="border-t border-white/10">
                    <td className="py-2 pr-3">{column.name}</td>
                    <td className="py-2 pr-3">{column.detectedType}</td>
                    <td className="py-2 pr-3">{column.mappedTo || "-"}</td>
                    <td className="py-2 pr-3">{column.isNumeric ? "Yes" : "No"}</td>
                    <td className="py-2 pr-3">{column.isCategorical ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Filters + Dataset Lifecycle</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Source</label>
            <select
              value={selectedSourceId}
              onChange={(event) => setSelectedSourceId(event.target.value)}
              className="w-full border border-white/20 bg-white/5 text-white rounded-lg px-3 py-2"
            >
              <option value="all" className="bg-slate-900 text-white">
                All Sources
              </option>
              {sources.map((source) => (
                <option key={source._id} value={source._id} className="bg-slate-900 text-white">
                  {source.sourceName} ({source.sourceType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Dataset</label>
            <select
              value={selectedDatasetId}
              onChange={(event) => setSelectedDatasetId(event.target.value)}
              className="w-full border border-white/20 bg-white/5 text-white rounded-lg px-3 py-2"
              disabled={selectedSourceId === "all"}
            >
              <option value="all" className="bg-slate-900 text-white">
                All Datasets
              </option>
              {datasets.map((dataset) => (
                <option key={dataset._id} value={dataset._id} className="bg-slate-900 text-white">
                  {dataset.fileName} ({dataset.recordCount || 0} rows){dataset.isActive ? "" : " [inactive]"}
                </option>
              ))}
            </select>
          </div>

          <label className="text-sm text-slate-200 flex items-end gap-2">
            <input
              type="checkbox"
              checked={includeInactiveDatasets}
              onChange={(event) => setIncludeInactiveDatasets(event.target.checked)}
            />
            Show inactive datasets
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSoftDeleteDataset}
            disabled={
              isDeletingDataset ||
              selectedSourceId === "all" ||
              selectedDatasetId === "all" ||
              !selectedDataset?.isActive
            }
            className="px-4 py-2 rounded-lg bg-rose-500 text-white font-semibold disabled:opacity-50"
          >
            {isDeletingDataset ? "Deleting..." : "Soft Delete Dataset"}
          </button>

          <button
            onClick={handleRestoreDataset}
            disabled={
              isRestoringDataset ||
              selectedSourceId === "all" ||
              selectedDatasetId === "all" ||
              selectedDataset?.isActive !== false
            }
            className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold disabled:opacity-50"
          >
            {isRestoringDataset ? "Restoring..." : "Restore Dataset"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-300">Total Records</p>
          <p className="text-2xl font-bold text-white mt-1">{formatMetric(summary.totalRecords)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-300">Total Revenue</p>
          <p className="text-2xl font-bold text-white mt-1">
            {summary.hasRevenue ? formatMetric(summary.totalRevenue) : "N/A"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-300">Total Units</p>
          <p className="text-2xl font-bold text-white mt-1">
            {summary.hasQuantity ? formatMetric(summary.totalUnits) : "N/A"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-300">Unique Customers</p>
          <p className="text-2xl font-bold text-white mt-1">
            {summary.hasCustomer ? formatMetric(summary.uniqueCustomers) : "N/A"}
          </p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Business Records</h2>
          <span className="text-sm text-slate-300">
            {pagination.total.toLocaleString()} total rows
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="min-w-full text-sm text-slate-100">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-300">
                <th className="py-2 px-3">Uploaded</th>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Revenue</th>
                <th className="py-2 px-3">Quantity</th>
                <th className="py-2 px-3">Product</th>
                <th className="py-2 px-3">Customer</th>
                <th className="py-2 px-3">Region</th>
                {rawColumns.map((column) => (
                  <th key={column} className="py-2 px-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record._id} className="border-t border-white/10">
                  <td className="py-2 px-3">
                    {record.uploadedAt ? new Date(record.uploadedAt).toLocaleString() : "-"}
                  </td>
                  <td className="py-2 px-3">
                    {record.date ? new Date(record.date).toLocaleDateString() : "-"}
                  </td>
                  <td className="py-2 px-3">{record.revenue ?? "-"}</td>
                  <td className="py-2 px-3">{record.quantity ?? "-"}</td>
                  <td className="py-2 px-3">{record.product ?? "-"}</td>
                  <td className="py-2 px-3">{record.customer ?? "-"}</td>
                  <td className="py-2 px-3">{record.region ?? "-"}</td>
                  {rawColumns.map((column) => (
                    <td key={`${record._id}-${column}`} className="py-2 px-3">
                      {record.rawData?.[column] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoadingRecords && records.length === 0 ? (
            <p className="text-center text-slate-300 py-6">No records found for selected filters.</p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-300">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoadingRecords}
              className="px-3 py-2 rounded-lg border border-white/20 text-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoadingRecords}
              className="px-3 py-2 rounded-lg border border-white/20 text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CsvUpload;
