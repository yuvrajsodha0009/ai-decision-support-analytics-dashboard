/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  normalizeAnalyticsDateRange,
  resolveStoredAnalyticsDateRange,
} from "../utils/analyticsDateRange";
import {
  fetchCurrentUser,
  updateAnalyticsDateRangePreference as persistAnalyticsDateRangePreference,
} from "../Services/userApi";

const AnalyticsFiltersContext = createContext(null);

const getDefaultTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const createDefaultFilters = (dateRange) => ({
  start: dateRange.start,
  end: dateRange.end,
  region: "",
  country: "",
  state: "",
  city: "",
  category: "",
  product: "",
  segment: "",
  customerType: "",
  channel: "",
  subcategory: "",
  device: "",
  mapMetric: "revenue",
  mapLevel: "world",
  mapDateRange: dateRange.preset,
  groupBy: "day",
  timezone: getDefaultTimezone(),
  compareMode: false,
});

const mergeFilterPatch = (previous, patch = {}) => {
  if (!patch || typeof patch !== "object") return previous;

  const next = {
    ...previous,
    ...patch,
  };

  const hasStart = Object.prototype.hasOwnProperty.call(patch, "start");
  const hasEnd = Object.prototype.hasOwnProperty.call(patch, "end");

  if (hasStart || hasEnd) {
    const normalizedDateRange = normalizeAnalyticsDateRange({
      preset: patch.mapDateRange || previous.mapDateRange,
      start: hasStart ? patch.start : previous.start,
      end: hasEnd ? patch.end : previous.end,
    });

    next.start = normalizedDateRange.start;
    next.end = normalizedDateRange.end;
    next.mapDateRange = normalizedDateRange.preset;
  } else if (Object.prototype.hasOwnProperty.call(patch, "mapDateRange")) {
    next.mapDateRange = patch.mapDateRange;
  }

  return next;
};

export const AnalyticsFiltersProvider = ({ children }) => {
  const initialDateRange = useMemo(() => resolveStoredAnalyticsDateRange(), []);
  const [savedDateRange, setSavedDateRange] = useState(initialDateRange);
  const [filters, setFiltersState] = useState(() =>
    createDefaultFilters(initialDateRange)
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSavingDatePreference, setIsSavingDatePreference] = useState(false);

  const rehydrateAnalyticsFilters = useCallback(async () => {
    const fallbackDateRange = resolveStoredAnalyticsDateRange();
    const token = localStorage.getItem("token");

    setIsHydrated(false);

    if (!token) {
      setSavedDateRange(fallbackDateRange);
      setFiltersState(createDefaultFilters(fallbackDateRange));
      setIsHydrated(true);
      return fallbackDateRange;
    }

    try {
      const response = await fetchCurrentUser();
      const hydratedDateRange = resolveStoredAnalyticsDateRange(
        response?.user?.preferences?.analyticsDateRange
      );

      setSavedDateRange(hydratedDateRange);
      setFiltersState(createDefaultFilters(hydratedDateRange));
      return hydratedDateRange;
    } catch {
      setSavedDateRange(fallbackDateRange);
      setFiltersState(createDefaultFilters(fallbackDateRange));
      return fallbackDateRange;
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    rehydrateAnalyticsFilters();
  }, [rehydrateAnalyticsFilters]);

  useEffect(() => {
    const handleAuthChange = () => {
      rehydrateAnalyticsFilters();
    };

    const handleStorage = (event) => {
      if (event.key === "token") {
        rehydrateAnalyticsFilters();
      }
    };

    window.addEventListener("auth-changed", handleAuthChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [rehydrateAnalyticsFilters]);

  const saveDateRangePreference = useCallback(
    async (input, options = {}) => {
      const normalizedDateRange = normalizeAnalyticsDateRange(input);
      const shouldSyncFilters = options.syncFilters !== false;

      setSavedDateRange(normalizedDateRange);

      if (shouldSyncFilters) {
        setFiltersState((previous) =>
          mergeFilterPatch(previous, {
            start: normalizedDateRange.start,
            end: normalizedDateRange.end,
            mapDateRange: normalizedDateRange.preset,
          })
        );
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return normalizedDateRange;
      }

      setIsSavingDatePreference(true);
      try {
        const response = await persistAnalyticsDateRangePreference(normalizedDateRange);
        const persistedDateRange = resolveStoredAnalyticsDateRange(
          response?.analyticsDateRange || response?.user?.preferences?.analyticsDateRange
        );

        setSavedDateRange(persistedDateRange);

        if (shouldSyncFilters) {
          setFiltersState((previous) =>
            mergeFilterPatch(previous, {
              start: persistedDateRange.start,
              end: persistedDateRange.end,
              mapDateRange: persistedDateRange.preset,
            })
          );
        }

        return persistedDateRange;
      } catch {
        return normalizedDateRange;
      } finally {
        setIsSavingDatePreference(false);
      }
    },
    []
  );

  const applyFilterPatch = useCallback(
    async (patch = {}, options = {}) => {
      const shouldPersistDateRange = Boolean(options.persistDateRange);
      const hasDatePatch =
        Object.prototype.hasOwnProperty.call(patch, "start") ||
        Object.prototype.hasOwnProperty.call(patch, "end");

      const nextDateRange =
        shouldPersistDateRange || hasDatePatch
          ? normalizeAnalyticsDateRange({
              preset: options.datePreset || patch.mapDateRange || filters.mapDateRange,
              start: patch.start ?? filters.start,
              end: patch.end ?? filters.end,
            })
          : null;

      const nextPatch = nextDateRange
        ? {
            ...patch,
            start: nextDateRange.start,
            end: nextDateRange.end,
            mapDateRange: nextDateRange.preset,
          }
        : patch;

      setFiltersState((previous) => mergeFilterPatch(previous, nextPatch));

      if (shouldPersistDateRange && nextDateRange) {
        await saveDateRangePreference(nextDateRange, { syncFilters: false });
      }

      return nextDateRange;
    },
    [filters.end, filters.mapDateRange, filters.start, saveDateRangePreference]
  );

  const previousRange = useMemo(() => {
    const currentStart = new Date(filters.start);
    const currentEnd = new Date(filters.end);
    const duration = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration);

    return {
      start: previousStart.toISOString(),
      end: previousEnd.toISOString(),
    };
  }, [filters.start, filters.end]);

  const value = useMemo(
    () => ({
      filters,
      previousRange,
      savedDateRange,
      isHydrated,
      isSavingDatePreference,
      setFilter: (key, value) =>
        setFiltersState((previous) => mergeFilterPatch(previous, { [key]: value })),
      setFilters: (patch) =>
        setFiltersState((previous) => mergeFilterPatch(previous, patch)),
      applyFilterPatch,
      saveDateRangePreference,
      rehydrateAnalyticsFilters,
      resetFilters: () => setFiltersState(createDefaultFilters(savedDateRange)),
    }),
    [
      applyFilterPatch,
      filters,
      isHydrated,
      isSavingDatePreference,
      previousRange,
      rehydrateAnalyticsFilters,
      saveDateRangePreference,
      savedDateRange,
    ]
  );

  return (
    <AnalyticsFiltersContext.Provider value={value}>
      {children}
    </AnalyticsFiltersContext.Provider>
  );
};

export const useAnalyticsFilters = () => {
  const context = useContext(AnalyticsFiltersContext);
  if (!context) {
    throw new Error(
      "useAnalyticsFilters must be used within AnalyticsFiltersProvider"
    );
  }
  return context;
};
