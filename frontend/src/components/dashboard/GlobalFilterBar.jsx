import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Filter, RotateCcw } from "lucide-react";
import { useAnalyticsFilters } from "../../context/AnalyticsFiltersContext";
import {
  ANALYTICS_DATE_PRESET_OPTIONS,
  buildEndIso,
  buildStartIso,
  getPresetRange,
  getPresetFromRange,
  toDateInputValue,
} from "../../utils/analyticsDateRange";
import DashboardCard from "./DashboardCard";

const inputClassName =
  "h-10 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 ease-in-out focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/40";

const SelectField = ({ label, value, options, onChange }) => (
  <label className="flex flex-col gap-1.5 text-sm">
    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
      {label}
    </span>
    <select value={value} onChange={onChange} className={inputClassName}>
      <option value="">All</option>
      {options.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  </label>
);

const GlobalFilterBar = ({ options, loading, showCompareToggle = true }) => {
  const { filters, applyFilterPatch, resetFilters } = useAnalyticsFilters();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [draftFilters, setDraftFilters] = useState(filters);
  const safeOptions = {
    regions: options?.regions || [],
    countries: options?.countries || [],
    categories: options?.categories || [],
    subcategories: options?.subcategories || [],
    devices: options?.devices || [],
  };

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const selectedPreset =
    draftFilters.mapDateRange === "custom"
      ? "custom"
      : getPresetFromRange(draftFilters.start, draftFilters.end);

  const updateDraft = (key, value) => {
    setDraftFilters((previous) => ({ ...previous, [key]: value }));
  };

  const handlePreset = (preset) => {
    if (preset === "custom") {
      updateDraft("mapDateRange", "custom");
      return;
    }
    const range = getPresetRange(preset);
    setDraftFilters((previous) => ({
      ...previous,
      start: range.start,
      end: range.end,
      mapDateRange: preset,
      groupBy: preset === "today" ? "hour" : previous.groupBy,
    }));
  };

  const applyFilters = async () => {
    const currentPreset =
      filters.mapDateRange === "custom"
        ? "custom"
        : getPresetFromRange(filters.start, filters.end);
    const hasDateChanged =
      draftFilters.start !== filters.start ||
      draftFilters.end !== filters.end ||
      selectedPreset !== currentPreset;

    await applyFilterPatch(draftFilters, {
      persistDateRange: hasDateChanged,
      datePreset: selectedPreset,
    });
  };

  const dateControls = (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ANALYTICS_DATE_PRESET_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handlePreset(option.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-in-out ${
              selectedPreset === option.value
                ? "bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-300/60"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-700/80 hover:text-slate-100"
            }`}
          >
            {option.shortLabel}
          </button>
        ))}
      </div>

      {selectedPreset === "custom" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Start Date
            </span>
            <input
              type="date"
              value={toDateInputValue(draftFilters.start)}
              onChange={(event) => {
                if (!event.target.value) return;
                setDraftFilters((previous) => ({
                  ...previous,
                  start: buildStartIso(event.target.value),
                  mapDateRange: "custom",
                }));
              }}
              className={inputClassName}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              End Date
            </span>
            <input
              type="date"
              value={toDateInputValue(draftFilters.end)}
              onChange={(event) => {
                if (!event.target.value) return;
                setDraftFilters((previous) => ({
                  ...previous,
                  end: buildEndIso(event.target.value),
                  mapDateRange: "custom",
                }));
              }}
              className={inputClassName}
            />
          </label>
        </div>
      )}
    </>
  );

  return (
    <DashboardCard
      className="mb-6 p-6"
      gradientClassName="bg-gradient-to-br from-cyan-500/20 via-slate-900/10 to-indigo-500/20"
      hoverable={false}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-2 text-cyan-300">
            <Filter size={14} />
          </span>
          <h2 className="text-lg font-semibold text-slate-100">
            Global Filters
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((previous) => !previous)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition-all duration-200 ease-in-out hover:border-cyan-400/50 hover:bg-slate-700/70"
        >
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {isCollapsed ? "Expand Filters" : "Collapse Filters"}
        </button>
      </div>

      {dateControls}

      {!isCollapsed && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SelectField
            label="Region"
            value={draftFilters.region}
            options={safeOptions.regions}
            onChange={(event) => updateDraft("region", event.target.value)}
          />

          <SelectField
            label="Country"
            value={draftFilters.country}
            options={safeOptions.countries}
            onChange={(event) => updateDraft("country", event.target.value)}
          />

          <SelectField
            label="Category"
            value={draftFilters.category}
            options={safeOptions.categories}
            onChange={(event) => updateDraft("category", event.target.value)}
          />

          <SelectField
            label="Subcategory"
            value={draftFilters.subcategory}
            options={safeOptions.subcategories}
            onChange={(event) => updateDraft("subcategory", event.target.value)}
          />

          <SelectField
            label="Device"
            value={draftFilters.device}
            options={safeOptions.devices}
            onChange={(event) => updateDraft("device", event.target.value)}
          />

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Group By
            </span>
            <select
              value={draftFilters.groupBy}
              onChange={(event) => updateDraft("groupBy", event.target.value)}
              className={inputClassName}
            >
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Timezone
            </span>
            <input
              type="text"
              value={draftFilters.timezone}
              readOnly
              className={`${inputClassName} cursor-not-allowed opacity-70`}
            />
          </label>

          {showCompareToggle && (
            <label className="flex items-end pb-1">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(draftFilters.compareMode)}
                  onChange={(event) =>
                    updateDraft("compareMode", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-400/60"
                />
                Compare with Previous Period
              </span>
            </label>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-xs text-slate-500">
          Changes apply across all dashboard widgets
        </p>

        <div className="flex items-center gap-3">
          <span
            className="hidden h-7 w-px bg-white/10 sm:inline-block"
            aria-hidden
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/70 px-4 py-2 text-sm font-medium text-slate-200 transition-all duration-200 ease-in-out hover:bg-slate-700/80"
            >
              <RotateCcw size={14} />
              Clear All
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-700/20 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:opacity-95"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};

export default GlobalFilterBar;
