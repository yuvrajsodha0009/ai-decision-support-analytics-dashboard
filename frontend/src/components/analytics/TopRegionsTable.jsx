import {
  formatCurrency,
  formatDelta,
  formatNumber,
} from "../../utils/analyticsFormatters";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

const headerClassName =
  "px-1.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400";
const cellClassName = "px-1.5 py-2.5 text-right text-xs text-slate-200";

const TrendIndicator = ({ value }) => {
  const numeric = Number(value || 0);
  if (numeric > 0) {
    return (
      <span className="inline-flex items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-500/12 p-1 text-emerald-300">
        <ArrowUpRight size={12} />
      </span>
    );
  }
  if (numeric < 0) {
    return (
      <span className="inline-flex items-center justify-center rounded-full border border-rose-400/35 bg-rose-500/12 p-1 text-rose-300">
        <ArrowDownRight size={12} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center rounded-full border border-slate-400/25 bg-slate-500/12 p-1 text-slate-300">
      <Minus size={12} />
    </span>
  );
};

const GrowthIndicator = ({ value }) => {
  const numeric = Number(value || 0);
  const positive = numeric > 0;
  const negative = numeric < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  const displayValue = numeric === 0 ? "0.0%" : formatDelta(numeric);
  const toneClassName = positive
    ? "text-emerald-300"
    : negative
      ? "text-rose-300"
      : "text-slate-300";

  return (
    <span className={`inline-flex items-center justify-end gap-1 text-xs font-semibold ${toneClassName}`}>
      <Icon size={13} />
      {displayValue}
    </span>
  );
};

const TopRegionsTable = ({
  rows = [],
  level = "world",
  loading = false,
  error = "",
  onDrillDown,
}) => {
  const hasRows = Array.isArray(rows) && rows.length > 0;

  const drillLabel =
    level === "world"
      ? "country"
      : level === "country"
        ? "state"
        : level === "state"
          ? "city"
          : "";

  const handleRowClick = (row) => {
    if (!drillLabel || typeof onDrillDown !== "function") return;
    onDrillDown(drillLabel, row.name);
  };

  return (
    <section className="h-full rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-md sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Top Regions</h3>
        {drillLabel && (
          <span className="text-[11px] text-slate-400">Click row to drill into {drillLabel}</span>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="h-8 animate-pulse rounded-md border border-white/10 bg-slate-900/70"
            />
          ))}
        </div>
      )}

      {!loading && error && <p className="text-sm text-rose-300">{error}</p>}

      {!loading && !error && !hasRows && (
        <p className="text-sm text-slate-400">
          No regional data found for the selected filters.
        </p>
      )}

      {!loading && !error && hasRows && (
        <div className="max-h-[588px] overflow-auto">
          <table className="w-full min-w-[580px] border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-1.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Rank
                </th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Region
                </th>
                <th className={headerClassName}>Revenue</th>
                <th className={headerClassName}>Orders</th>
                <th className={headerClassName}>AOV</th>
                <th className={headerClassName}>Customers</th>
                <th className={headerClassName}>Growth</th>
                <th className={`${headerClassName} w-[44px]`}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.name}-${index}`}
                  onClick={() => handleRowClick(row)}
                  className={`border-b border-white/5 ${
                    drillLabel
                      ? "cursor-pointer transition-colors hover:bg-slate-800/55"
                      : ""
                  }`}
                >
                  <td className="px-1.5 py-2.5 text-left text-xs text-slate-300">{index + 1}</td>
                  <td className="px-1.5 py-2.5 text-left text-xs font-medium text-slate-100">
                    {row.name}
                  </td>
                  <td className={cellClassName}>{formatCurrency(row.revenue)}</td>
                  <td className={cellClassName}>{formatNumber(row.orders)}</td>
                  <td className={cellClassName}>{formatCurrency(row.aov)}</td>
                  <td className={cellClassName}>{formatNumber(row.customers)}</td>
                  <td className="px-1.5 py-2.5 text-right">
                    <GrowthIndicator value={row.growth} />
                  </td>
                  <td className="px-1.5 py-2.5 text-right">
                    <TrendIndicator value={row.growth} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default TopRegionsTable;
