import { lazy, Suspense, useCallback, useMemo } from "react";
import {
  BarChart3,
  ChevronLeft,
  Globe2,
  Lightbulb,
  LineChart as LineChartIcon,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import MapFilters from "../components/analytics/MapFilters";
import RegionKPICards from "../components/analytics/RegionKPICards";
import GeoHeatMapPanel from "../components/analytics/GeoHeatMapPanel";
import TopRegionsTable from "../components/analytics/TopRegionsTable";
import InsightCards from "../components/analytics/InsightCards";
import GeoBreadcrumb from "../components/analytics/GeoBreadcrumb";
import InsightBanner from "../components/analytics/InsightBanner";
import AnalyticsSectionCard from "../components/analytics/AnalyticsSectionCard";
import { formatPercent } from "../utils/analyticsFormatters";
import { useGeoAnalyticsFilters } from "../hooks/useGeoAnalyticsFilters";
import { useGeoAnalyticsQueries } from "../hooks/useGeoAnalyticsQueries";

const RevenueTrendChart = lazy(() => import("../components/analytics/RevenueTrendChart"));
const RegionBarChart = lazy(() => import("../components/analytics/RegionBarChart"));
const CategoryHeatmap = lazy(() => import("../components/analytics/CategoryHeatmap"));

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "";

const LazyChartFallback = () => (
  <div className="h-[350px] animate-pulse rounded-2xl border border-white/10 bg-slate-900/65" />
);

const MapAnalytics = () => {
  const navigate = useNavigate();
  const {
    mapFilters,
    setGeoFilter,
    setGeoFilters,
    applyDatePreset,
    applyCustomDateRange,
    drillToLevel,
  } = useGeoAnalyticsFilters();

  const {
    mapLevel,
    optionsQuery,
    summaryQuery,
    mapQuery,
    topRegionsQuery,
    revenueTrendQuery,
    previousRevenueTrendQuery,
    regionBarQuery,
    categoryHeatmapQuery,
    insightsQuery,
  } = useGeoAnalyticsQueries(mapFilters);

  const handleDatePresetChange = useCallback(
    (preset) => {
      applyDatePreset(preset);
    },
    [applyDatePreset]
  );

  const handleCustomDateRange = useCallback(
    (startDate, endDate) => {
      applyCustomDateRange(startDate, endDate);
    },
    [applyCustomDateRange]
  );

  const syncSegmentAndCustomerType = useCallback((key, value, patch) => {
    if (key === "segment") {
      const normalized = String(value || "").toLowerCase();
      if (normalized === "prospect") patch.customerType = "new";
      if (normalized === "loyal") patch.customerType = "returning";
    }

    if (key === "customerType") {
      const normalized = String(value || "").toLowerCase();
      if (normalized === "new") patch.segment = "Prospect";
      if (normalized === "returning") patch.segment = "Loyal";
      if (!normalized) patch.segment = "";
    }
  }, []);

  const handleFilterChange = useCallback(
    (key, value) => {
      const normalized = String(value || "").trim();
      const patch = {
        [key]: normalized,
      };

      if (key === "metric") {
        setGeoFilter("metric", normalized || "revenue");
        return;
      }

      if (key === "country") {
        if (!normalized) {
          patch.level = "world";
          patch.state = "";
          patch.city = "";
        } else if (mapFilters.level === "world") {
          patch.level = "country";
          patch.state = "";
          patch.city = "";
        } else {
          patch.state = "";
          patch.city = "";
        }
      }

      if (key === "state") {
        if (!normalized) {
          if (mapFilters.level === "state" || mapFilters.level === "city") {
            patch.level = "country";
          }
          patch.city = "";
        } else if (mapFilters.level === "country") {
          patch.level = "state";
          patch.city = "";
        }
      }

      if (key === "region" && !normalized && mapFilters.level === "world") {
        patch.country = "";
        patch.state = "";
        patch.city = "";
      }

      syncSegmentAndCustomerType(key, normalized, patch);
      setGeoFilters(patch);
    },
    [mapFilters.level, setGeoFilter, setGeoFilters, syncSegmentAndCustomerType]
  );

  const handleDrillDown = useCallback(
    (nextLevel, value) => {
      if (!value) return;
      if (nextLevel === "country") {
        drillToLevel("country", value);
        return;
      }
      if (nextLevel === "state") {
        drillToLevel("state", value);
        return;
      }
      if (nextLevel === "city") {
        drillToLevel("city", value);
      }
    },
    [drillToLevel]
  );

  const handleBreadcrumbClick = useCallback(
    (targetLevel) => {
      if (targetLevel === "world") {
        drillToLevel("world");
        return;
      }
      if (targetLevel === "country") {
        drillToLevel("country", mapFilters.country);
        return;
      }
      if (targetLevel === "state") {
        drillToLevel("state", mapFilters.state);
      }
    },
    [drillToLevel, mapFilters.country, mapFilters.state]
  );

  const breadcrumbs = useMemo(() => {
    const items = [{ level: "world", label: "World" }];
    if (mapFilters.level !== "world" && mapFilters.country) {
      items.push({ level: "country", label: mapFilters.country });
    }
    if ((mapFilters.level === "state" || mapFilters.level === "city") && mapFilters.state) {
      items.push({ level: "state", label: mapFilters.state });
    }
    if (mapFilters.level === "city" && mapFilters.city) {
      items.push({ level: "city", label: mapFilters.city });
    }
    return items;
  }, [mapFilters.level, mapFilters.country, mapFilters.state, mapFilters.city]);

  const mapRows = Array.isArray(mapQuery.data) ? mapQuery.data : [];
  const topRegionsRows = Array.isArray(topRegionsQuery.data) ? topRegionsQuery.data : [];
  const trendRows = Array.isArray(revenueTrendQuery.data) ? revenueTrendQuery.data : [];
  const previousTrendRows = Array.isArray(previousRevenueTrendQuery.data)
    ? previousRevenueTrendQuery.data
    : [];
  const regionBarRows = Array.isArray(regionBarQuery.data) ? regionBarQuery.data : [];
  const insightsRows = Array.isArray(insightsQuery.data?.insights)
    ? insightsQuery.data.insights
    : [];

  const options = optionsQuery.data || {};
  const summaryData = summaryQuery.data || {};
  const topRegionLabel = summaryData?.topRegion || "N/A";
  const topRegionGrowth = formatPercent(summaryData?.comparisons?.revenue, 1);
  const trendLoading =
    revenueTrendQuery.isLoading ||
    revenueTrendQuery.isFetching ||
    previousRevenueTrendQuery.isLoading ||
    previousRevenueTrendQuery.isFetching;
  const trendError =
    getErrorMessage(revenueTrendQuery.error) ||
    getErrorMessage(previousRevenueTrendQuery.error);

  const topRegionBadge = (
    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
      Top Region: {topRegionLabel}
      {topRegionLabel !== "N/A" && (
        <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-1.5 py-0.5">
          {topRegionGrowth}
        </span>
      )}
    </span>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(99,102,241,0.14),transparent_32%),linear-gradient(135deg,#020617_0%,#0b1220_45%,#111827_100%)] px-4 py-5 text-[#e6e6e6] sm:px-5 lg:px-6 lg:py-6">
      <div className="mx-auto w-full max-w-[1500px]">
        <p className="mb-1 text-xs text-[#9aa0a6]">Dashboard &gt; Map Analytics</p>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-[#f1f3f4]">
            Map Analytics
          </h1>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-500/40 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-100 transition-colors hover:border-cyan-400/45 hover:bg-slate-800/75 hover:text-cyan-100"
          >
            <ChevronLeft size={14} />
            Back
          </button>
        </div>

        <div className="space-y-6">
          <MapFilters
            filters={mapFilters}
            options={options}
            loading={optionsQuery.isLoading || optionsQuery.isFetching}
            onFilterChange={handleFilterChange}
            onDatePresetChange={handleDatePresetChange}
            onApplyCustomRange={handleCustomDateRange}
          />

          <AnalyticsSectionCard
            title="Overview"
            subtitle="Executive snapshot of current map analytics performance"
            icon={BarChart3}
          >
            <RegionKPICards
              summary={summaryData}
              loading={summaryQuery.isLoading || summaryQuery.isFetching}
              error={getErrorMessage(summaryQuery.error)}
            />
          </AnalyticsSectionCard>

          <InsightBanner
            insights={insightsRows}
            loading={insightsQuery.isLoading || insightsQuery.isFetching}
            error={getErrorMessage(insightsQuery.error)}
          />

          <AnalyticsSectionCard
            title="Geographic Performance"
            subtitle="Regional distribution and drill-down exploration"
            badge={topRegionBadge}
            icon={Globe2}
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <div className="space-y-3">
                  <GeoBreadcrumb
                    items={breadcrumbs}
                    activeLevel={mapFilters.level}
                    onNavigate={handleBreadcrumbClick}
                  />
                  <GeoHeatMapPanel
                    level={mapFilters.level}
                    mapLevel={mapLevel}
                    country={mapFilters.country}
                    metric={mapFilters.metric}
                    rows={mapRows}
                    loading={mapQuery.isLoading || mapQuery.isFetching}
                    error={getErrorMessage(mapQuery.error)}
                    onDrillDown={handleDrillDown}
                  />
                </div>
              </div>

              <div className="xl:col-span-1">
                <TopRegionsTable
                  rows={topRegionsRows}
                  level={mapFilters.level}
                  loading={topRegionsQuery.isLoading || topRegionsQuery.isFetching}
                  error={getErrorMessage(topRegionsQuery.error)}
                  onDrillDown={handleDrillDown}
                />
              </div>
            </div>
          </AnalyticsSectionCard>

          <AnalyticsSectionCard
            title="Trend Analysis"
            subtitle="Revenue movement over the selected timeline"
            icon={LineChartIcon}
          >
            <Suspense fallback={<LazyChartFallback />}>
              <RevenueTrendChart
                data={trendRows}
                previousData={previousTrendRows}
                loading={trendLoading}
                error={trendError}
              />
            </Suspense>
          </AnalyticsSectionCard>

          <AnalyticsSectionCard
            title="Performance Drivers"
            subtitle="Compare key country contribution and category intensity"
            icon={Zap}
          >
            <div className="grid gap-4 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <Suspense fallback={<LazyChartFallback />}>
                  <RegionBarChart
                    data={regionBarRows}
                    metric={mapFilters.metric}
                    loading={regionBarQuery.isLoading || regionBarQuery.isFetching}
                    error={getErrorMessage(regionBarQuery.error)}
                  />
                </Suspense>
              </div>

              <div className="xl:col-span-7">
                <Suspense fallback={<LazyChartFallback />}>
                  <CategoryHeatmap
                    data={categoryHeatmapQuery.data}
                    loading={categoryHeatmapQuery.isLoading || categoryHeatmapQuery.isFetching}
                    error={getErrorMessage(categoryHeatmapQuery.error)}
                  />
                </Suspense>
              </div>
            </div>
          </AnalyticsSectionCard>

          <AnalyticsSectionCard
            title="Key Insights"
            subtitle="AI-assisted highlights for growth, risk, and opportunity"
            icon={Lightbulb}
          >
            <InsightCards
              insights={insightsRows}
              loading={insightsQuery.isLoading || insightsQuery.isFetching}
              error={getErrorMessage(insightsQuery.error)}
            />
          </AnalyticsSectionCard>
        </div>
      </div>
    </div>
  );
};

export default MapAnalytics;
