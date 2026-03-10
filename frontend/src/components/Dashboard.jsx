import { useEffect, useMemo, useRef, useState } from "react";
import { useAnalyticsFilters } from "../context/AnalyticsFiltersContext";
import {
  fetchAnalyticsByCategory,
  fetchAnalyticsByDevice,
  fetchAnalyticsByRegion,
  fetchAnalyticsFilterOptions,
  fetchAnalyticsSeries,
  fetchAnalyticsSummary,
} from "../Services/analyticsApi";
import GlobalFilterBar from "./dashboard/GlobalFilterBar";
import KpiCards from "./dashboard/KpiCards";
import RevenueTrendChart from "./dashboard/RevenueTrendChart";
import RevenueByCategoryChart from "./dashboard/RevenueByCategoryChart";
import RevenueByRegionChart from "./dashboard/RevenueByRegionChart";
import DeviceSplitChart from "./dashboard/DeviceSplitChart";
import DecisionInsights from "./dashboard/DecisionInsights";
import ConversionFunnel from "./dashboard/ConversionFunnel";

const emptyOptions = {
  regions: [],
  countries: [],
  categories: [],
  subcategories: [],
  devices: [],
};

const defaultInsights = {
  bestCategory: null,
  bestCategoryRevenue: 0,
  needsAttentionCategory: null,
  needsAttentionGrowth: null,
  growthDescription: "Not enough data to generate growth insights.",
  riskDescription: "No risk signals available for the selected range.",
  recommendation: "Not enough data to generate recommendations.",
  warningDescription: "No warning detected for the selected range.",
};

const calculateGrowth = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value || 0);

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const safeDivide = (numerator, denominator) => {
  const a = toNullableNumber(numerator);
  const b = toNullableNumber(denominator);
  if (a === null || b === null || b === 0) return null;
  return a / b;
};

const buildInsights = (currentCategoryRows, previousCategoryRows, compareMode) => {
  if (!currentCategoryRows.length) return defaultInsights;

  const sortedByRevenue = [...currentCategoryRows].sort(
    (a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)
  );
  const topCategory = sortedByRevenue[0];

  if (!compareMode || !previousCategoryRows.length) {
    return {
      ...defaultInsights,
      bestCategory: topCategory.category,
      bestCategoryRevenue: topCategory.totalRevenue || 0,
      growthDescription: `${topCategory.category} currently leads revenue with ${formatNumber(
        topCategory.totalRevenue || 0
      )}.`,
      riskDescription:
        "Enable Compare with Previous Period to evaluate growth-based risk signals.",
      recommendation:
        "Use compare mode to unlock growth-aware recommendations and warnings.",
      warningDescription: "No warning generated while comparison mode is disabled.",
    };
  }

  const previousMap = new Map(
    previousCategoryRows.map((row) => [row.category, row.totalRevenue || 0])
  );

  const rankedByRevenue = sortedByRevenue.map((row, index) => {
    const previousRevenue = previousMap.get(row.category) || 0;
    return {
      ...row,
      revenueRank: index + 1,
      growth: calculateGrowth(row.totalRevenue || 0, previousRevenue),
    };
  });

  const marketLeader = rankedByRevenue[0];
  const lowRevenueStartIndex = Math.max(1, Math.floor(rankedByRevenue.length / 2));
  const lowRevenueRows = rankedByRevenue.filter(
    (_, index) => index >= lowRevenueStartIndex
  );

  const riskCandidate =
    lowRevenueRows
      .filter((row) => row.growth < 0)
      .sort((a, b) => a.growth - b.growth)[0] || null;

  const emergingCandidate =
    lowRevenueRows
      .filter((row) => row.growth > 0)
      .sort((a, b) => b.growth - a.growth)[0] || null;

  const growthDescription =
    marketLeader.growth >= 0
      ? `${marketLeader.category} leads revenue and is still growing (${marketLeader.growth.toFixed(
          2
        )}%).`
      : `Market leader slowing: ${marketLeader.category} still leads revenue but growth is ${marketLeader.growth.toFixed(
          2
        )}%.`;

  const riskDescription = riskCandidate
    ? `${riskCandidate.category} has low revenue and declining growth (${riskCandidate.growth.toFixed(
        2
      )}%).`
    : "No low-revenue category is showing negative growth in this comparison window.";

  let recommendation = "Maintain current allocation and continue monitoring trend shifts.";
  if (riskCandidate) {
    recommendation = `Stabilize ${riskCandidate.category} with targeted campaigns while defending ${marketLeader.category}.`;
  } else if (emergingCandidate) {
    recommendation = `${emergingCandidate.category} is emerging with positive growth. Test incremental budget shift.`;
  } else if (marketLeader.growth < 0) {
    recommendation = `Protect core demand in ${marketLeader.category} before scaling expansion categories.`;
  }

  const warningDescription =
    marketLeader.growth < 0
      ? `Warning: top revenue category ${marketLeader.category} is now contracting.`
      : riskCandidate && riskCandidate.growth < -10
        ? `Warning: ${riskCandidate.category} shows steep decline (${riskCandidate.growth.toFixed(
            2
          )}%).`
        : "No severe warning threshold breached in this cycle.";

  return {
    ...defaultInsights,
    bestCategory: marketLeader.category,
    bestCategoryRevenue: marketLeader.totalRevenue || 0,
    needsAttentionCategory: riskCandidate?.category || null,
    needsAttentionGrowth: riskCandidate ? Number(riskCandidate.growth.toFixed(2)) : null,
    growthDescription,
    riskDescription,
    recommendation,
    warningDescription,
  };
};

const Dashboard = () => {
  const { filters, previousRange } = useAnalyticsFilters();
  const requestRef = useRef(0);

  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [previousSeries, setPreviousSeries] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
  const [regionRows, setRegionRows] = useState([]);
  const [deviceRows, setDeviceRows] = useState([]);
  const [insights, setInsights] = useState(defaultInsights);
  const [filterOptions, setFilterOptions] = useState(emptyOptions);

  const [loading, setLoading] = useState({
    summary: false,
    trend: false,
    breakdowns: false,
    insights: false,
    options: false,
  });

  const [errors, setErrors] = useState({
    summary: "",
    trend: "",
    breakdowns: "",
    insights: "",
    options: "",
  });

  useEffect(() => {
    let cancelled = false;

    const fetchOptions = async () => {
      setLoading((prev) => ({ ...prev, options: true }));
      setErrors((prev) => ({ ...prev, options: "" }));
      try {
        const options = await fetchAnalyticsFilterOptions(filters);
        if (!cancelled) setFilterOptions(options || emptyOptions);
      } catch (error) {
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            options: error?.response?.data?.message || "Failed to load filter options",
          }));
        }
      } finally {
        if (!cancelled) setLoading((prev) => ({ ...prev, options: false }));
      }
    };

    fetchOptions();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestRef.current;

    const fetchDashboard = async () => {
      setLoading((prev) => ({
        ...prev,
        summary: true,
        trend: true,
        breakdowns: true,
        insights: true,
      }));

      setErrors((prev) => ({
        ...prev,
        summary: "",
        trend: "",
        breakdowns: "",
        insights: "",
      }));

      const currentFilters = { ...filters };
      const previousFilters = {
        ...filters,
        start: previousRange.start,
        end: previousRange.end,
      };

      const [
        summaryResult,
        seriesResult,
        previousSeriesResult,
        categoryResult,
        regionResult,
        deviceResult,
        previousCategoryResult,
      ] = await Promise.allSettled([
        fetchAnalyticsSummary(currentFilters),
        fetchAnalyticsSeries(currentFilters),
        filters.compareMode
          ? fetchAnalyticsSeries(previousFilters)
          : Promise.resolve([]),
        fetchAnalyticsByCategory(currentFilters),
        fetchAnalyticsByRegion(currentFilters),
        fetchAnalyticsByDevice(currentFilters),
        filters.compareMode
          ? fetchAnalyticsByCategory(previousFilters)
          : Promise.resolve([]),
      ]);

      if (cancelled || requestId !== requestRef.current) return;

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
      } else {
        setErrors((prev) => ({
          ...prev,
          summary:
            summaryResult.reason?.response?.data?.message ||
            "Failed to load summary metrics",
        }));
      }

      if (seriesResult.status === "fulfilled") {
        setSeries(seriesResult.value || []);
      } else {
        setErrors((prev) => ({
          ...prev,
          trend:
            seriesResult.reason?.response?.data?.message ||
            "Failed to load revenue trend",
        }));
      }

      if (previousSeriesResult.status === "fulfilled") {
        setPreviousSeries(previousSeriesResult.value || []);
      } else {
        setPreviousSeries([]);
        setErrors((prev) => ({
          ...prev,
          trend:
            previousSeriesResult.reason?.response?.data?.message ||
            "Failed to load compare trend",
        }));
      }

      const breakdownFailed =
        categoryResult.status !== "fulfilled" ||
        regionResult.status !== "fulfilled" ||
        deviceResult.status !== "fulfilled";

      if (!breakdownFailed) {
        setCategoryRows(categoryResult.value || []);
        setRegionRows(regionResult.value || []);
        setDeviceRows(deviceResult.value || []);
      } else {
        setErrors((prev) => ({
          ...prev,
          breakdowns: "Failed to load one or more breakdown charts",
        }));
      }

      if (categoryResult.status === "fulfilled") {
        const canCompareInsights =
          filters.compareMode && previousCategoryResult.status === "fulfilled";

        if (filters.compareMode && previousCategoryResult.status !== "fulfilled") {
          setErrors((prev) => ({
            ...prev,
            insights: "Failed to compute compare-based insights",
          }));
        }

        setInsights(
          buildInsights(
            categoryResult.value || [],
            previousCategoryResult.status === "fulfilled"
              ? previousCategoryResult.value || []
              : [],
            canCompareInsights
          )
        );
      } else {
        setInsights(defaultInsights);
        setErrors((prev) => ({
          ...prev,
          insights: "Failed to compute dynamic insights",
        }));
      }

      setLoading((prev) => ({
        ...prev,
        summary: false,
        trend: false,
        breakdowns: false,
        insights: false,
      }));
    };

    fetchDashboard().catch((error) => {
      if (cancelled) return;
      console.error("Dashboard fetch failed", error);
      setLoading((prev) => ({
        ...prev,
        summary: false,
        trend: false,
        breakdowns: false,
        insights: false,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [filters, previousRange]);

  const trendChartData = useMemo(
    () =>
      series.map((row, index) => ({
        period: row.period,
        currentRevenue: toNullableNumber(row.totalRevenue),
        currentOrders: toNullableNumber(row.totalOrders),
        currentAov: safeDivide(row.totalRevenue, row.totalOrders),
        previousRevenue: filters.compareMode
          ? toNullableNumber(previousSeries[index]?.totalRevenue)
          : null,
        previousOrders: filters.compareMode
          ? toNullableNumber(previousSeries[index]?.totalOrders)
          : null,
        previousAov: filters.compareMode
          ? safeDivide(
              previousSeries[index]?.totalRevenue,
              previousSeries[index]?.totalOrders
            )
          : null,
        totalRevenue: toNullableNumber(row.totalRevenue),
        totalOrders: toNullableNumber(row.totalOrders),
        totalQuantity: toNullableNumber(row.totalQuantity),
      })),
    [series, previousSeries, filters.compareMode]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(99,102,241,0.14),transparent_32%),linear-gradient(135deg,#020617_0%,#0b1220_45%,#111827_100%)] p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                Dynamic Analytics
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Sales Command Center
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Real-time aggregation powered by <span className="font-medium">rawsales</span>
              </p>
            </div>
            <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100">
              Live snapshot updates with filter-driven insights
            </div>
          </div>
        </header>

        <GlobalFilterBar options={filterOptions} loading={loading.options} />
        {errors.options && <p className="mb-4 text-sm text-rose-300">{errors.options}</p>}

        <KpiCards
          summary={summary}
          trendData={trendChartData}
          loading={loading.summary}
          error={errors.summary}
          compareMode={filters.compareMode}
        />

        <div className="mb-6">
          <RevenueTrendChart
            data={trendChartData}
            compareMode={filters.compareMode}
            loading={loading.trend}
            error={errors.trend}
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 2xl:grid-cols-5">
          <div className="2xl:col-span-3">
            <RevenueByCategoryChart
              data={categoryRows}
              loading={loading.breakdowns}
              error={errors.breakdowns}
            />
          </div>
          <div className="2xl:col-span-2">
            <RevenueByRegionChart
              data={regionRows}
              loading={loading.breakdowns}
              error={errors.breakdowns}
            />
          </div>
        </div>

        <div className="mb-6">
          <DeviceSplitChart
            data={deviceRows}
            loading={loading.breakdowns}
            error={errors.breakdowns}
          />
        </div>

        <div className="mb-6">
          <ConversionFunnel summary={summary} loading={loading.summary} />
        </div>

        <DecisionInsights
          insights={insights}
          loading={loading.insights}
          error={errors.insights}
        />
      </div>
    </div>
  );
};

export default Dashboard;
