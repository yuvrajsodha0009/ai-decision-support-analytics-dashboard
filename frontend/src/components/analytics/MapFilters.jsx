import { useState } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { ANALYTICS_DATE_PRESET_OPTIONS } from "../../utils/analyticsDateRange";
import { GEO_METRIC_OPTIONS } from "../../utils/geoAnalyticsConstants";
import AdvancedFiltersPanel from "./AdvancedFiltersPanel";

const selectClassName =
  "h-9 rounded-lg border border-white/10 bg-slate-900/70 px-3 text-xs text-slate-100 outline-none transition-colors focus:border-cyan-400/60";
const labelClassName = "text-[10px] uppercase tracking-wide text-slate-400";

const toOptions = (values = []) => (Array.isArray(values) ? values : []);

const MapFilters = ({
  filters,
  options,
  loading = false,
  onFilterChange,
  onDatePresetChange,
  onApplyCustomRange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(filters.customStartDate || "");
  const [customEndDate, setCustomEndDate] = useState(filters.customEndDate || "");

  const regions = toOptions(options?.regions);

  const handleCustomRangeApply = () => {
    onApplyCustomRange(customStartDate, customEndDate);
  };

  const handleDatePresetSelect = (event) => {
    const nextPreset = event.target.value;
    if (nextPreset === "custom") {
      setCustomStartDate(filters.customStartDate || "");
      setCustomEndDate(filters.customEndDate || "");
    }
    onDatePresetChange(nextPreset);
  };

  const CollapseIcon = isCollapsed ? ChevronDown : ChevronUp;
  const AdvancedIcon = isAdvancedOpen ? ChevronUp : ChevronDown;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-md sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm text-slate-200">
          <span className="rounded-md border border-cyan-400/25 bg-cyan-400/10 p-1.5 text-cyan-200">
            <Filter size={14} />
          </span>
          Global Filters
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed((previous) => !previous)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-slate-900/70 px-3 text-xs text-slate-100 transition-colors hover:border-cyan-400/55 hover:text-cyan-100"
        >
          <CollapseIcon size={14} />
          {isCollapsed ? "Expand Filters" : "Collapse Filters"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={labelClassName}>Date Range</span>
          <select
            value={filters.dateRange}
            onChange={handleDatePresetSelect}
            className={selectClassName}
          >
            {ANALYTICS_DATE_PRESET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filters.dateRange === "custom" && (
        <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-3 sm:p-4">
          <p className="mb-2 text-xs font-medium text-slate-300">Custom Date Range</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[150px] flex-col gap-1">
              <span className={labelClassName}>Start</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                className={selectClassName}
              />
            </label>
            <label className="flex min-w-[150px] flex-col gap-1">
              <span className={labelClassName}>End</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                className={selectClassName}
              />
            </label>
            <button
              type="button"
              onClick={handleCustomRangeApply}
              className="h-9 rounded-lg border border-white/15 bg-slate-800/80 px-3 text-xs font-medium text-slate-100 transition-colors hover:border-cyan-400/60 hover:text-cyan-100"
            >
              Apply Custom Range
            </button>
          </div>
        </div>
      )}

      {!isCollapsed && (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className={labelClassName}>Metric</span>
              <select
                value={filters.metric}
                onChange={(event) => onFilterChange("metric", event.target.value)}
                className={selectClassName}
              >
                {GEO_METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className={labelClassName}>Region</span>
              <select
                value={filters.region}
                onChange={(event) => onFilterChange("region", event.target.value)}
                className={selectClassName}
              >
                <option value="">All Regions</option>
                {regions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1">
              <span className={labelClassName}>More Controls</span>
              <button
                type="button"
                onClick={() => setIsAdvancedOpen((previous) => !previous)}
                className="inline-flex h-9 items-center justify-between rounded-lg border border-white/10 bg-slate-900/70 px-3 text-xs text-slate-100 transition-colors hover:border-cyan-400/55 hover:text-cyan-100"
              >
                <span>Advanced Filters</span>
                <AdvancedIcon size={14} />
              </button>
            </div>
          </div>

          <AdvancedFiltersPanel
            isOpen={isAdvancedOpen}
            filters={filters}
            options={options}
            loading={loading}
            onFilterChange={onFilterChange}
          />
        </>
      )}

      <div className="mt-3 text-[11px] text-slate-400">
        {loading ? "Refreshing options..." : "Narrative analytics view"}
      </div>
    </section>
  );
};

export default MapFilters;
