/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";

const AnalyticsFiltersContext = createContext(null);

const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

const createDefaultFilters = () => {
  const range = getDefaultDateRange();
  return {
    ...range,
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
    mapDateRange: "last30",
    groupBy: "day",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    compareMode: false,
  };
};

export const AnalyticsFiltersProvider = ({ children }) => {
  const [filters, setFilters] = useState(createDefaultFilters);

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
      setFilter: (key, value) =>
        setFilters((prev) => ({
          ...prev,
          [key]: value,
        })),
      setFilters: (patch) =>
        setFilters((prev) => ({
          ...prev,
          ...patch,
        })),
      resetFilters: () => setFilters(createDefaultFilters()),
    }),
    [filters, previousRange]
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
