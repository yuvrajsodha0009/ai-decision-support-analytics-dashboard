import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useAnalyticsFilters } from "../context/AnalyticsFiltersContext";
import GlobalFilterBar from "../components/dashboard/GlobalFilterBar";
import {
  downloadAdminSalesExport,
  fetchAdminSales,
  fetchAnalyticsFilterOptions,
} from "../Services/analyticsApi";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const defaultOptions = {
  regions: [],
  countries: [],
  categories: [],
  subcategories: [],
  devices: [],
};

const AdminSalesPage = () => {
  const { filters, isHydrated } = useAnalyticsFilters();
  const [rows, setRows] = useState([]);
  const [filterOptions, setFilterOptions] = useState(defaultOptions);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isHydrated) return undefined;

    let cancelled = false;
    const loadFilterOptions = async () => {
      setLoadingOptions(true);
      try {
        const options = await fetchAnalyticsFilterOptions(filters);
        if (!cancelled) setFilterOptions(options || defaultOptions);
      } catch {
        if (!cancelled) setFilterOptions(defaultOptions);
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };

    loadFilterOptions();
    return () => {
      cancelled = true;
    };
  }, [filters, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filters, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return undefined;

    let cancelled = false;

    const loadRows = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchAdminSales(
          filters,
          pagination.page,
          pagination.limit
        );

        if (cancelled) return;
        setRows(response.rows || []);
        setPagination((prev) => ({
          ...prev,
          ...(response.pagination || {}),
        }));
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError?.response?.data?.message || "Failed to load raw sales table");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRows();
    return () => {
      cancelled = true;
    };
  }, [filters, pagination.page, pagination.limit, isHydrated]);

  const handleExport = async () => {
    try {
      setExporting(true);
      await downloadAdminSalesExport(filters);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Admin Raw Sales</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Filtered transaction-level records from rawsales
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Download size={16} />
          {exporting ? "Exporting..." : "Export Current View"}
        </button>
      </div>

      <GlobalFilterBar
        options={filterOptions}
        loading={loadingOptions}
        showCompareToggle={false}
      />
      {!isHydrated && (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-300">
          Loading saved filters...
        </p>
      )}

      {isHydrated && (
        <>
          {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

          <div className="surface-card rounded-2xl border border-[var(--border-soft)] overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
              <table className="w-full border-collapse text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="p-3 text-left">Timestamp</th>
                    <th className="p-3 text-left">Transaction</th>
                    <th className="p-3 text-left">Region</th>
                    <th className="p-3 text-left">Country</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-left">Subcategory</th>
                    <th className="p-3 text-left">Device</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="table-row table-row-hover">
                      <td className="p-3">
                        {row.timestamp ? new Date(row.timestamp).toLocaleString() : "N/A"}
                      </td>
                      <td className="p-3">{row.transactionId || "N/A"}</td>
                      <td className="p-3">{row.region || "N/A"}</td>
                      <td className="p-3">{row.country || "N/A"}</td>
                      <td className="p-3">{row.category || "N/A"}</td>
                      <td className="p-3">{row.subcategory || "N/A"}</td>
                      <td className="p-3">{row.device || "N/A"}</td>
                      <td className="p-3 text-right">{row.quantity ?? 0}</td>
                      <td className="p-3 text-right">{formatCurrency(row.revenue)}</td>
                      <td className="p-3">{row.orderStatus || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading && (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-300">
                Loading sales records...
              </p>
            )}
            {!loading && rows.length === 0 && (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-300">
                No sales records found for the selected filters.
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-slate-500 dark:text-slate-300">
              Page {pagination.page} of {pagination.totalPages} | {pagination.total} records
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                }
                className="px-3 py-1 rounded border border-[var(--border-soft)] disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.min(prev.totalPages, prev.page + 1),
                  }))
                }
                className="px-3 py-1 rounded border border-[var(--border-soft)] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminSalesPage;
