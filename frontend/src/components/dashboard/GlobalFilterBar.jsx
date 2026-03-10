import { useEffect, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
} from "lucide-react";
import { useAnalyticsFilters } from "../../context/AnalyticsFiltersContext";
import DashboardCard from "./DashboardCard";

const toDateInputValue = (isoDate) => {
  if (!isoDate) return "";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const buildStartIso = (inputDate) => new Date(`${inputDate}T00:00:00.000Z`).toISOString();
const buildEndIso = (inputDate) => new Date(`${inputDate}T23:59:59.999Z`).toISOString();

const calculatePreset = (startIso, endIso) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Custom";

  const startUtc = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  );
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const diffDays = Math.round((endUtc - startUtc) / 86400000) + 1;

  if (diffDays <= 1) return "Today";
  if (diffDays === 7) return "7D";
  if (diffDays === 30) return "30D";
  if (diffDays === 90) return "90D";
  return "Custom";
};

const getPresetRange = (preset) => {
  const now = new Date();
  const dayEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );

  if (preset === "Today") {
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );
    return { start: dayStart.toISOString(), end: dayEnd.toISOString() };
  }

  const presetDays = {
    "7D": 7,
    "30D": 30,
    "90D": 90,
  };

  const totalDays = presetDays[preset] || 30;
  const start = new Date(dayEnd);
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));
  start.setUTCHours(0, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: dayEnd.toISOString(),
  };
};

const inputClassName =
  "h-10 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 ease-in-out focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/40";

const SelectField = ({ label, value, options, onChange }) => (
  <label className="flex flex-col gap-1.5 text-sm">
    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
    <select
      value={value}
      onChange={onChange}
      className={inputClassName}
    >
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
  const { filters, setFilters, resetFilters } = useAnalyticsFilters();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);
  const [selectedPreset, setSelectedPreset] = useState("Custom");

  useEffect(() => {
    setDraftFilters(filters);
    setSelectedPreset(calculatePreset(filters.start, filters.end));
  }, [filters]);

  const updateDraft = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePreset = (preset) => {
    setSelectedPreset(preset);
    if (preset === "Custom") return;
    const range = getPresetRange(preset);
    setDraftFilters((prev) => ({
      ...prev,
      start: range.start,
      end: range.end,
    }));
  };

  const applyFilters = () => {
    const safeStart = new Date(draftFilters.start);
    const safeEnd = new Date(draftFilters.end);

    if (safeStart.getTime() > safeEnd.getTime()) {
      setFilters({
        ...draftFilters,
        start: draftFilters.end,
        end: draftFilters.start,
      });
      return;
    }

    setFilters(draftFilters);
  };

  const quickDateButtons = ["Today", "7D", "30D", "90D", "Custom"];

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
          <h2 className="text-lg font-semibold text-slate-100">Global Filters</h2>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition-all duration-200 ease-in-out hover:border-cyan-400/50 hover:bg-slate-700/70"
        >
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {isCollapsed ? "Expand Filters" : "Collapse Filters"}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300">
              <CalendarClock size={12} />
              Quick Date
            </span>
            {quickDateButtons.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handlePreset(option)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-in-out ${
                  selectedPreset === option
                    ? "bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-300/60"
                    : "bg-slate-800/70 text-slate-300 hover:bg-slate-700/80 hover:text-slate-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Start Date
              </span>
              <input
                type="date"
                value={toDateInputValue(draftFilters.start)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  updateDraft("start", buildStartIso(e.target.value));
                  setSelectedPreset("Custom");
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
                onChange={(e) => {
                  if (!e.target.value) return;
                  updateDraft("end", buildEndIso(e.target.value));
                  setSelectedPreset("Custom");
                }}
                className={inputClassName}
              />
            </label>

            <SelectField
              label="Region"
              value={draftFilters.region}
              options={options.regions}
              onChange={(e) => updateDraft("region", e.target.value)}
            />

            <SelectField
              label="Country"
              value={draftFilters.country}
              options={options.countries}
              onChange={(e) => updateDraft("country", e.target.value)}
            />

            <SelectField
              label="Category"
              value={draftFilters.category}
              options={options.categories}
              onChange={(e) => updateDraft("category", e.target.value)}
            />

            <SelectField
              label="Subcategory"
              value={draftFilters.subcategory}
              options={options.subcategories}
              onChange={(e) => updateDraft("subcategory", e.target.value)}
            />

            <SelectField
              label="Device"
              value={draftFilters.device}
              options={options.devices}
              onChange={(e) => updateDraft("device", e.target.value)}
            />

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Group By
              </span>
              <select
                value={draftFilters.groupBy}
                onChange={(e) => updateDraft("groupBy", e.target.value)}
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
                    onChange={(e) => updateDraft("compareMode", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-400/60"
                  />
                  Compare with Previous Period
                </span>
              </label>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              {loading ? "Loading filter options..." : "Filters ready"}
            </div>

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
        </>
      )}

      {isCollapsed && (
        <p className="text-sm text-slate-400">
          Filters are collapsed. Expand to update date range and dimensions.
        </p>
      )}

      {loading && !isCollapsed && (
        <p className="mt-3 text-xs text-slate-500">Refreshing available option values...</p>
      )}
    </DashboardCard>
  );
};

export default GlobalFilterBar;
