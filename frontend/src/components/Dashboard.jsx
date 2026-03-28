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
import { useAI } from "../hooks/useAI";
import AiSummaryCard from "./ai/AiSummaryCard";
import AIInsightCard from "./ai/AIInsightCard";
import AskAIDrawer from "./ai/AskAIDrawer";
import FloatingAIButton from "./ai/FloatingAIButton";
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

const TREND_METRIC_META = {
  revenue: {
    label: "Revenue",
    accessor: (row) => row.currentRevenue ?? 0,
  },
  orders: {
    label: "Orders",
    accessor: (row) => row.currentOrders ?? 0,
  },
  aov: {
    label: "AOV",
    accessor: (row) => row.currentAov ?? 0,
  },
};

const formatFilterLabel = (value, fallback) => {
  const normalized = String(value || "").trim();
  if (!normalized) return fallback;

  return normalized
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const CONTEXT_LABELS = {
  revenue_chart: "Revenue chart",
  orders_chart: "Orders chart",
  category_chart: "Category chart",
};

const PIN_STORAGE_PREFIX = "analytics-copilot-pins";
const MAX_PINNED_INSIGHTS = 12;

const getPinStorageKey = () => {
  if (typeof window === "undefined") {
    return `${PIN_STORAGE_PREFIX}:anonymous`;
  }

  const identity =
    window.localStorage.getItem("userEmail") ||
    window.localStorage.getItem("userName") ||
    window.localStorage.getItem("role") ||
    "anonymous";

  return `${PIN_STORAGE_PREFIX}:${String(identity).trim().toLowerCase()}`;
};

const normalizePinnedInsight = (insight) => {
  if (!insight || typeof insight !== "object") return null;

  const id = String(insight.id || "").trim();
  const intent = String(insight.intent || "").trim();

  if (!id || !intent) return null;

  return {
    id,
    intent,
    title: String(insight.title || "Pinned AI insight").trim(),
    payload: insight.payload || null,
  };
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

const buildInsights = (
  currentCategoryRows,
  previousCategoryRows,
  compareMode,
) => {
  if (!currentCategoryRows.length) return defaultInsights;

  const sortedByRevenue = [...currentCategoryRows].sort(
    (a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0),
  );
  const topCategory = sortedByRevenue[0];

  if (!compareMode || !previousCategoryRows.length) {
    return {
      ...defaultInsights,
      bestCategory: topCategory.category,
      bestCategoryRevenue: topCategory.totalRevenue || 0,
      growthDescription: `${topCategory.category} currently leads revenue with ${formatNumber(
        topCategory.totalRevenue || 0,
      )}.`,
      riskDescription:
        "Enable Compare with Previous Period to evaluate growth-based risk signals.",
      recommendation:
        "Use compare mode to unlock growth-aware recommendations and warnings.",
      warningDescription:
        "No warning generated while comparison mode is disabled.",
    };
  }

  const previousMap = new Map(
    previousCategoryRows.map((row) => [row.category, row.totalRevenue || 0]),
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
  const lowRevenueStartIndex = Math.max(
    1,
    Math.floor(rankedByRevenue.length / 2),
  );
  const lowRevenueRows = rankedByRevenue.filter(
    (_, index) => index >= lowRevenueStartIndex,
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
          2,
        )}%).`
      : `Market leader slowing: ${marketLeader.category} still leads revenue but growth is ${marketLeader.growth.toFixed(
          2,
        )}%.`;

  const riskDescription = riskCandidate
    ? `${riskCandidate.category} has low revenue and declining growth (${riskCandidate.growth.toFixed(
        2,
      )}%).`
    : "No low-revenue category is showing negative growth in this comparison window.";

  let recommendation =
    "Maintain current allocation and continue monitoring trend shifts.";
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
            2,
          )}%).`
        : "No severe warning threshold breached in this cycle.";

  return {
    ...defaultInsights,
    bestCategory: marketLeader.category,
    bestCategoryRevenue: marketLeader.totalRevenue || 0,
    needsAttentionCategory: riskCandidate?.category || null,
    needsAttentionGrowth: riskCandidate
      ? Number(riskCandidate.growth.toFixed(2))
      : null,
    growthDescription,
    riskDescription,
    recommendation,
    warningDescription,
  };
};

const Dashboard = () => {
  const { filters, previousRange, isHydrated } = useAnalyticsFilters();
  const requestRef = useRef(0);
  const kpiSectionRef = useRef(null);
  const revenueSectionRef = useRef(null);
  const categorySectionRef = useRef(null);

  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [previousSeries, setPreviousSeries] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
  const [regionRows, setRegionRows] = useState([]);
  const [deviceRows, setDeviceRows] = useState([]);
  const [insights, setInsights] = useState(defaultInsights);
  const [filterOptions, setFilterOptions] = useState(emptyOptions);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerContextKey, setDrawerContextKey] = useState("revenue_chart");
  const [pinnedInsights, setPinnedInsights] = useState([]);
  const [pinsHydrated, setPinsHydrated] = useState(false);
  const [activeTrendMetric, setActiveTrendMetric] = useState("revenue");
  const [isSummaryRequested, setIsSummaryRequested] = useState(false);

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

  const pinStorageKey = useMemo(() => getPinStorageKey(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedPins = window.localStorage.getItem(pinStorageKey);
      if (!storedPins) {
        setPinnedInsights([]);
        return;
      }

      const parsedPins = JSON.parse(storedPins);
      const normalizedPins = Array.isArray(parsedPins)
        ? parsedPins
            .map((item) => normalizePinnedInsight(item))
            .filter(Boolean)
            .slice(0, MAX_PINNED_INSIGHTS)
        : [];

      setPinnedInsights(normalizedPins);
    } catch (error) {
      console.error("Failed to restore pinned copilot insights", error);
      setPinnedInsights([]);
    } finally {
      setPinsHydrated(true);
    }
  }, [pinStorageKey]);

  useEffect(() => {
    if (!pinsHydrated || typeof window === "undefined") return;

    window.localStorage.setItem(pinStorageKey, JSON.stringify(pinnedInsights));
  }, [pinStorageKey, pinnedInsights, pinsHydrated]);

  useEffect(() => {
    if (!isHydrated) return undefined;

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
            options:
              error?.response?.data?.message || "Failed to load filter options",
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
  }, [filters, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return undefined;

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

      // Fetch each endpoint sequentially to avoid hitting the API with many parallel calls on load.
      // This helps prevent rate limits and ensures the UI can mount quickly.
      let summaryResult;
      try {
        summaryResult = await fetchAnalyticsSummary(currentFilters);
        if (cancelled || requestId !== requestRef.current) return;
        setSummary(summaryResult);
      } catch (error) {
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            summary:
              error?.response?.data?.message ||
              "Failed to load summary metrics",
          }));
        }
      }

      let seriesResult;
      try {
        seriesResult = await fetchAnalyticsSeries(currentFilters);
        if (cancelled || requestId !== requestRef.current) return;
        setSeries(seriesResult || []);
      } catch (error) {
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            trend:
              error?.response?.data?.message || "Failed to load revenue trend",
          }));
        }
      }

      if (filters.compareMode) {
        try {
          const previousSeriesResult =
            await fetchAnalyticsSeries(previousFilters);
          if (cancelled || requestId !== requestRef.current) return;
          setPreviousSeries(previousSeriesResult || []);
        } catch (error) {
          if (!cancelled) {
            setPreviousSeries([]);
            setErrors((prev) => ({
              ...prev,
              trend:
                error?.response?.data?.message ||
                "Failed to load compare trend",
            }));
          }
        }
      }

      let categoryResult;
      try {
        categoryResult = await fetchAnalyticsByCategory(currentFilters);
        if (cancelled || requestId !== requestRef.current) return;
        setCategoryRows(categoryResult || []);
      } catch (error) {
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            breakdowns: "Failed to load category breakdown",
          }));
        }
      }

      let regionResult;
      try {
        regionResult = await fetchAnalyticsByRegion(currentFilters);
        if (cancelled || requestId !== requestRef.current) return;
        setRegionRows(regionResult || []);
      } catch (error) {
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            breakdowns: "Failed to load region breakdown",
          }));
        }
      }

      let deviceResult;
      try {
        deviceResult = await fetchAnalyticsByDevice(currentFilters);
        if (cancelled || requestId !== requestRef.current) return;
        setDeviceRows(deviceResult || []);
      } catch (error) {
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            breakdowns: "Failed to load device breakdown",
          }));
        }
      }

      if (filters.compareMode) {
        try {
          const previousCategoryResult =
            await fetchAnalyticsByCategory(previousFilters);
          if (cancelled || requestId !== requestRef.current) return;

          const canCompareInsights =
            filters.compareMode && Array.isArray(previousCategoryResult);

          setInsights(
            buildInsights(
              categoryResult || [],
              canCompareInsights ? previousCategoryResult : [],
              canCompareInsights,
            ),
          );
        } catch (error) {
          if (!cancelled) {
            setErrors((prev) => ({
              ...prev,
              insights: "Failed to compute compare-based insights",
            }));
            setInsights(defaultInsights);
          }
        }
      } else {
        if (categoryResult) {
          setInsights(buildInsights(categoryResult, [], false));
        }
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
  }, [filters, previousRange, isHydrated]);

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
              previousSeries[index]?.totalOrders,
            )
          : null,
        totalRevenue: toNullableNumber(row.totalRevenue),
        totalOrders: toNullableNumber(row.totalOrders),
        totalQuantity: toNullableNumber(row.totalQuantity),
      })),
    [series, previousSeries, filters.compareMode],
  );

  const aiTrendSeries = useMemo(
    () =>
      trendChartData.map((row) => ({
        period: row.period,
        currentValue: row.currentRevenue ?? 0,
        currentRevenue: row.currentRevenue ?? 0,
        currentOrders: row.currentOrders ?? 0,
        currentAov: row.currentAov ?? 0,
      })),
    [trendChartData],
  );

  const aiFilterContext = useMemo(
    () => ({
      start: filters.start,
      end: filters.end,
      groupBy: filters.groupBy,
      timezone: filters.timezone,
      compareMode: filters.compareMode,
    }),
    [
      filters.start,
      filters.end,
      filters.groupBy,
      filters.timezone,
      filters.compareMode,
    ],
  );

  const topCategoryContext = useMemo(
    () =>
      categoryRows.slice(0, 5).map((row) => ({
        category: row.category,
        revenue: row.totalRevenue || 0,
        orders: row.totalOrders || 0,
        quantity: row.totalQuantity || 0,
      })),
    [categoryRows],
  );

  const topRegionContext = useMemo(
    () =>
      regionRows.slice(0, 3).map((row) => ({
        region: row.region,
        revenue: row.totalRevenue || 0,
        orders: row.totalOrders || 0,
      })),
    [regionRows],
  );

  const activeTrendMetricMeta =
    TREND_METRIC_META[activeTrendMetric] || TREND_METRIC_META.revenue;

  const aiSummaryPayload = useMemo(() => {
    if (!isHydrated) return null;

    return {
      question:
        "Provide a concise markdown summary of performance, risks, and next best actions based on this dashboard context.",
      data: aiTrendSeries.slice(-14),
      context: {
        outputStyle: "founder_summary",
        outputStyleVersion: "growth_analyst_v5",
        filters: aiFilterContext,
        summary: {
          totalRevenue: summary?.totalRevenue || 0,
          totalOrders: summary?.totalOrders || 0,
        },
        topCategories: topCategoryContext,
        topRegions: topRegionContext,
        activeMetric: activeTrendMetric,
      },
    };
  }, [
    activeTrendMetric,
    aiFilterContext,
    aiTrendSeries,
    isHydrated,
    summary,
    topCategoryContext,
    topRegionContext,
  ]);

  const summaryRequestPayload = isSummaryRequested ? aiSummaryPayload : null;

  const {
    data: aiSummaryResponse,
    isLoading: aiSummaryLoading,
    error: aiSummaryError,
    refetch: refetchAiSummary,
  } = useAI("nlq", summaryRequestPayload);

  const handleRefreshSummary = () => {
    if (!isSummaryRequested) {
      setIsSummaryRequested(true);
      return;
    }

    refetchAiSummary();
  };

  const aiSummaryText = useMemo(() => {
    if (aiSummaryError) {
      return `### Summary unavailable\n\n${aiSummaryError}`;
    }

    const responseText = aiSummaryResponse?.payload?.text;
    if (typeof responseText === "string" && responseText.trim()) {
      return responseText;
    }

    if (insights?.growthDescription || insights?.recommendation) {
      return [
        "### Performance Snapshot",
        insights.growthDescription || "No growth insight available.",
        "",
        "### Risk & Recommendation",
        insights.riskDescription || "No risk signal available.",
        "",
        `**Next action:** ${insights.recommendation || "No recommendation available."}`,
      ].join("\n");
    }

    return "No summary available yet.";
  }, [aiSummaryError, aiSummaryResponse, insights]);

  const drawerContext = useMemo(() => {
    const fullDashboardData = {
      revenueSeries: aiTrendSeries,
      ordersSeries: trendChartData.map((row) => ({
        period: row.period,
        currentOrders: row.currentOrders ?? 0,
        currentRevenue: row.currentRevenue ?? 0,
      })),
      categorySeries: topCategoryContext.map((row) => ({
        category: row.category,
        revenue: row.revenue ?? 0,
        orders: row.orders ?? 0,
      })),
      regionSeries: topRegionContext.map((row) => ({
        region: row.region,
        revenue: row.revenue ?? 0,
        orders: row.orders ?? 0,
      })),
    };

    const sharedContext = {
      filters: aiFilterContext,
      summary: {
        totalRevenue: summary?.totalRevenue || 0,
        totalOrders: summary?.totalOrders || 0,
      },
      topCategories: topCategoryContext,
      topRegions: topRegionContext,
      dashboardData: fullDashboardData,
    };

    if (drawerContextKey === "orders_chart") {
      return {
        ...sharedContext,
        activeContext: "orders_chart",
        label: CONTEXT_LABELS.orders_chart,
        data: trendChartData.map((row) => ({
          period: row.period,
          currentValue: row.currentOrders ?? 0,
          currentOrders: row.currentOrders ?? 0,
          currentRevenue: row.currentRevenue ?? 0,
        })),
      };
    }

    if (drawerContextKey === "category_chart") {
      return {
        ...sharedContext,
        activeContext: "category_chart",
        label: CONTEXT_LABELS.category_chart,
        data: topCategoryContext.map((row) => ({
          period: row.category,
          currentValue: row.revenue ?? 0,
          currentRevenue: row.revenue ?? 0,
          currentOrders: row.orders ?? 0,
        })),
      };
    }

    return {
      ...sharedContext,
      activeContext: "revenue_chart",
      label: CONTEXT_LABELS.revenue_chart,
      data: aiTrendSeries.map((row) => ({
        ...row,
        currentOrders: row.currentOrders ?? 0,
        currentRevenue: row.currentRevenue ?? row.currentValue ?? 0,
      })),
    };
  }, [
    aiFilterContext,
    aiTrendSeries,
    drawerContextKey,
    summary,
    topCategoryContext,
    topRegionContext,
    trendChartData,
  ]);

  const openAIDrawer = () => {
    // Deterministic anchor: use selected trend metric instead of viewport heuristics.
    const nextContext =
      activeTrendMetric === "orders" ? "orders_chart" : "revenue_chart";

    setDrawerContextKey(nextContext);
    setIsDrawerOpen(true);
  };

  const handlePinInsight = (insight) => {
    const normalizedInsight = normalizePinnedInsight(insight);
    if (!normalizedInsight) return;

    setPinnedInsights((previous) => {
      if (previous.some((item) => item.id === normalizedInsight.id)) {
        return previous.filter((item) => item.id !== normalizedInsight.id);
      }

      return [normalizedInsight, ...previous].slice(0, MAX_PINNED_INSIGHTS);
    });
  };

  const handleRemovePinnedInsight = (insightId) => {
    setPinnedInsights((previous) =>
      previous.filter((item) => item.id !== insightId),
    );
  };

  const pinnedInsightIds = useMemo(
    () => new Set(pinnedInsights.map((item) => item.id)),
    [pinnedInsights],
  );

  return (
    <div className="min-h-screen bg-fixed bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(99,102,241,0.14),transparent_32%),linear-gradient(135deg,#020617_0%,#0b1220_45%,#111827_100%)] p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 rounded-2xl border border-white/10 bg-slate-900/55 px-6 py-4 shadow-xl backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Sales Command Center
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                AI requests now flow through a centralized Node to Python
                gateway.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
              Live
              <span className="text-emerald-300/70">|</span>
              <span className="text-emerald-100/85">Updated now</span>
            </div>
          </div>
        </header>

        <GlobalFilterBar options={filterOptions} loading={loading.options} />
        {!isHydrated && (
          <p className="mb-4 text-sm text-slate-300">
            Loading saved filters...
          </p>
        )}
        {isHydrated && (
          <>
            {errors.options && (
              <p className="mb-4 text-sm text-rose-300">{errors.options}</p>
            )}

            <div ref={kpiSectionRef}>
              <KpiCards
                summary={summary}
                trendData={trendChartData}
                loading={loading.summary}
                error={errors.summary}
                compareMode={filters.compareMode}
              />
            </div>

            <section className="my-6">
              <AiSummaryCard
                summary={aiSummaryText}
                loading={aiSummaryLoading}
                onRefresh={handleRefreshSummary}
              />
            </section>

            <div ref={revenueSectionRef} className="mb-6">
              <RevenueTrendChart
                data={trendChartData}
                compareMode={filters.compareMode}
                loading={loading.trend}
                error={errors.trend}
                activeMetric={activeTrendMetric}
                onMetricChange={setActiveTrendMetric}
              />
            </div>

            <div
              ref={categorySectionRef}
              className="mb-6 grid grid-cols-1 gap-6 2xl:grid-cols-5"
            >
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

            {pinnedInsights.length > 0 && (
              <section className="mt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Pinned Copilot Insights
                  </h3>
                  <p className="text-sm text-slate-400">
                    Saved AI responses from the drawer, promoted into reusable
                    dashboard cards
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  {pinnedInsights.map((insight) => (
                    <AIInsightCard
                      key={insight.id}
                      insightId={insight.id}
                      intent={insight.intent}
                      data={insight.payload}
                      title={insight.title}
                      onRemove={handleRemovePinnedInsight}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <AskAIDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        context={drawerContext}
        onPinInsight={handlePinInsight}
        pinnedInsightIds={pinnedInsightIds}
      />
      <FloatingAIButton isOpen={isDrawerOpen} onClick={openAIDrawer} />
    </div>
  );
};

export default Dashboard;
