import { useEffect, useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { MapChart } from "echarts/charts";
import {
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { useQuery } from "@tanstack/react-query";
import { fetchMapGeoJson } from "../../Services/mapAnalyticsApi";
import { formatMetricValue } from "../../utils/analyticsFormatters";
import { GEO_METRIC_LABELS } from "../../utils/geoAnalyticsConstants";

echarts.use([
  MapChart,
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);
countries.registerLocale(enLocale);

const COUNTRY_NAME_ALIASES = {
  "United States of America": "United States",
  "Russian Federation": "Russia",
  "Republic of Korea": "South Korea",
  "Korea, Republic of": "South Korea",
  "Democratic People's Republic of Korea": "North Korea",
  Czechia: "Czech Republic",
  "Viet Nam": "Vietnam",
  "Lao PDR": "Laos",
  "Syrian Arab Republic": "Syria",
  "Iran (Islamic Republic of)": "Iran",
  "Moldova (Republic of)": "Moldova",
  Türkiye: "Turkey",
  "TÃ¼rkiye": "Turkey",
  "TÃƒÂ¼rkiye": "Turkey",
};

const normalizeGeoName = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const COUNTRY_ALIAS_BY_NORMALIZED = Object.entries(COUNTRY_NAME_ALIASES).reduce(
  (accumulator, [source, target]) => {
    accumulator[normalizeGeoName(source)] = target;
    return accumulator;
  },
  {},
);

const REGISTERED_MAPS = new Set();

const resolveCountryCode = (countryName) => {
  if (typeof countryName !== "string" || !countryName.trim()) return "";

  const trimmed = countryName.trim();
  const normalized = normalizeGeoName(trimmed);
  const alias =
    COUNTRY_NAME_ALIASES[trimmed] || COUNTRY_ALIAS_BY_NORMALIZED[normalized];
  const attempts = [trimmed, alias].filter(Boolean);

  for (const name of attempts) {
    const code = countries.getAlpha2Code(name, "en");
    if (code) return code.toLowerCase();
  }

  return "";
};

const toSafeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatSignedPercent = (value, digits = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `0.${"0".repeat(Math.max(digits, 0))}%`;
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
  return `${sign}${Math.abs(numeric).toFixed(digits)}%`;
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Failed to load map geometry";

const GeoHeatMapPanel = ({
  level,
  mapLevel,
  country,
  metric,
  rows,
  loading = false,
  error = "",
  onDrillDown,
}) => {
  const countryCode = useMemo(() => resolveCountryCode(country), [country]);
  const mapName = useMemo(
    () => (mapLevel === "world" ? "world-map" : `country-map-${countryCode}`),
    [mapLevel, countryCode],
  );

  const geometryQuery = useQuery({
    queryKey: ["geoAnalytics", "map-geometry", mapLevel, countryCode],
    queryFn: () =>
      fetchMapGeoJson(
        mapLevel === "world"
          ? { level: "world" }
          : {
              level: "country",
              countryCode,
            },
      ),
    enabled: mapLevel === "world" || Boolean(countryCode),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!geometryQuery.data) return;

    if (!REGISTERED_MAPS.has(mapName)) {
      echarts.registerMap(mapName, geometryQuery.data);
      REGISTERED_MAPS.add(mapName);
    }
  }, [geometryQuery.data, mapName]);

  const mapFeatureIndex = useMemo(() => {
    const features = Array.isArray(geometryQuery.data?.features)
      ? geometryQuery.data.features
      : [];
    const nameByNormalized = new Map();
    const nameByIso = new Map();
    const featureEntries = [];

    features.forEach((feature) => {
      const properties = feature?.properties || {};
      const featureName = String(properties?.name || "").trim();
      if (!featureName) return;

      const normalized = normalizeGeoName(featureName);
      if (normalized && !nameByNormalized.has(normalized)) {
        nameByNormalized.set(normalized, featureName);
      }
      featureEntries.push({ normalized, name: featureName });

      const isoA2 = String(
        properties?.["iso-a2"] || properties?.["hc-a2"] || "",
      )
        .trim()
        .toLowerCase();
      if (isoA2 && isoA2.length === 2 && !nameByIso.has(isoA2)) {
        nameByIso.set(isoA2, featureName);
      }

      const hcKey = String(properties?.["hc-key"] || "")
        .trim()
        .toLowerCase();
      if (hcKey && hcKey.length === 2 && !nameByIso.has(hcKey)) {
        nameByIso.set(hcKey, featureName);
      }
    });

    return {
      nameByNormalized,
      nameByIso,
      featureEntries,
    };
  }, [geometryQuery.data]);

  const mappedSeriesData = useMemo(() => {
    const incomingRows = Array.isArray(rows) ? rows : [];
    if (!incomingRows.length) {
      return { rows: [], matchedCount: 0, totalCount: 0 };
    }

    if (mapLevel === "world") {
      const mapped = incomingRows.map((entry) => {
        const rawName = String(entry?.name || "").trim();
        const aliasName = COUNTRY_NAME_ALIASES[rawName] || rawName;
        const isoCode =
          resolveCountryCode(rawName) || resolveCountryCode(aliasName);
        const normalizedCandidates = [
          normalizeGeoName(rawName),
          normalizeGeoName(aliasName),
        ].filter(Boolean);

        let matchedName = isoCode
          ? mapFeatureIndex.nameByIso.get(isoCode) || ""
          : "";
        if (!matchedName) {
          matchedName =
            normalizedCandidates
              .map(
                (candidate) =>
                  mapFeatureIndex.nameByNormalized.get(candidate) || "",
              )
              .find(Boolean) || "";
        }

        return {
          ...entry,
          name: matchedName || rawName || "Unknown",
          backendName: rawName || entry?.name || "",
          isoCode,
          __matched: Boolean(matchedName),
        };
      });

      const matchedRows = mapped.filter((row) => row.__matched);
      const renderedRows = (matchedRows.length > 0 ? matchedRows : mapped).map(
        (entry) => {
          const row = { ...entry };
          delete row.__matched;
          return row;
        },
      );

      return {
        rows: renderedRows,
        matchedCount: matchedRows.length,
        totalCount: mapped.length,
      };
    }

    const mapped = incomingRows.map((entry) => {
      const rawName = String(entry?.name || "").trim();
      const normalized = normalizeGeoName(rawName);
      let matchedName = mapFeatureIndex.nameByNormalized.get(normalized) || "";

      if (!matchedName && normalized) {
        const relaxedMatch = mapFeatureIndex.featureEntries.find(
          (feature) =>
            feature.normalized === normalized ||
            feature.normalized.startsWith(normalized) ||
            normalized.startsWith(feature.normalized),
        );
        matchedName = relaxedMatch?.name || "";
      }

      return {
        ...entry,
        name: matchedName || rawName || "Unknown",
        backendName: rawName || entry?.name || "",
        __matched: Boolean(matchedName),
      };
    });

    const matchedRows = mapped.filter((row) => row.__matched);
    const renderedRows = (matchedRows.length > 0 ? matchedRows : mapped).map(
      (entry) => {
        const row = { ...entry };
        delete row.__matched;
        return row;
      },
    );

    return {
      rows: renderedRows,
      matchedCount: matchedRows.length,
      totalCount: mapped.length,
    };
  }, [rows, mapLevel, mapFeatureIndex]);

  const backendCountryByIso = useMemo(() => {
    const lookup = new Map();
    if (mapLevel !== "world") return lookup;

    mappedSeriesData.rows.forEach((entry) => {
      if (entry?.isoCode && entry?.backendName) {
        lookup.set(entry.isoCode, entry.backendName);
      }
    });
    return lookup;
  }, [mapLevel, mappedSeriesData.rows]);

  const seriesData = mappedSeriesData.rows;

  const valueRange = useMemo(() => {
    if (!seriesData.length) return { min: 0, max: 1 };

    const values = seriesData.map((entry) => toSafeNumber(entry?.value));
    const min = Math.min(...values);
    const rawMax = Math.max(...values);
    const max = rawMax === min ? min + 1 : rawMax;

    return { min, max };
  }, [seriesData]);

  const chartOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      animationDuration: 700,
      animationDurationUpdate: 650,
      animationEasingUpdate: "cubicOut",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(2, 6, 23, 0.96)",
        borderColor: "rgba(34, 211, 238, 0.3)",
        borderWidth: 1,
        textStyle: {
          color: "#e2e8f0",
          fontSize: 12,
        },
        formatter: (params) => {
          const row = params?.data || {};
          const label = params?.name || row.name || "Unknown";
          const revenue = formatMetricValue(
            "revenue",
            row.revenue ?? row.value ?? 0,
          );
          const orders = formatMetricValue("orders", row.orders ?? 0);
          const aov = formatMetricValue("aov", row.aov ?? 0);
          const customers = formatMetricValue("customers", row.customers ?? 0);
          const growth = formatSignedPercent(
            row.revenueGrowth ?? row.growth ?? 0,
            1,
          );
          return `
            <div style="min-width:170px;">
              <div style="font-weight:600;margin-bottom:6px;">${label}</div>
              <div>Revenue: ${revenue}</div>
              <div>Orders: ${orders}</div>
              <div>AOV: ${aov}</div>
              <div>Customers: ${customers}</div>
              <div>Growth: ${growth}</div>
            </div>
          `;
        },
      },
      visualMap: {
        min: valueRange.min,
        max: valueRange.max,
        left: 16,
        bottom: 12,
        orient: "vertical",
        text: ["High", "Low"],
        textStyle: {
          color: "#94a3b8",
        },
        calculable: true,
        itemWidth: 10,
        itemHeight: 100,
        inRange: {
          color: ["#0f172a", "#155e75", "#0891b2", "#22d3ee", "#a5f3fc"],
        },
      },
      series: [
        {
          type: "map",
          map: mapName,
          roam: true,
          zoom: mapLevel === "world" ? 1.05 : 1.1,
          scaleLimit: { min: 1, max: 18 },
          data: seriesData,
          itemStyle: {
            areaColor: "#111827",
            borderColor: "rgba(148, 163, 184, 0.45)",
            borderWidth: 0.9,
          },
          emphasis: {
            itemStyle: {
              areaColor: "#0ea5e9",
              borderColor: "#67e8f9",
              borderWidth: 1.1,
            },
            label: {
              show: false,
            },
          },
        },
      ],
    }),
    [mapName, mapLevel, seriesData, valueRange.min, valueRange.max],
  );

  const onEvents = useMemo(
    () => ({
      click: (params) => {
        if (typeof onDrillDown !== "function") return;

        if (mapLevel === "world" && level === "world") {
          const clickedName =
            typeof params?.name === "string" ? params.name : "";
          const clickedIso = resolveCountryCode(clickedName);
          const backendName =
            params?.data?.backendName ||
            (clickedIso ? backendCountryByIso.get(clickedIso) : "") ||
            clickedName;
          if (!backendName) return;
          onDrillDown("country", backendName);
          return;
        }

        if (
          mapLevel === "country" &&
          (level === "country" || level === "state" || level === "city")
        ) {
          const stateName = String(params?.name || "").trim();
          if (!stateName) return;
          onDrillDown("state", stateName);
        }
      },
    }),
    [mapLevel, level, backendCountryByIso, onDrillDown],
  );

  const geometryError =
    mapLevel === "country" && !countryCode
      ? `No country map key found for "${country}"`
      : "";
  const showError =
    error ||
    geometryError ||
    (geometryQuery.error ? getErrorMessage(geometryQuery.error) : "");
  const showLoading = loading || geometryQuery.isLoading;
  const nameMismatchWarning =
    mapLevel === "country" &&
    !showLoading &&
    !showError &&
    Array.isArray(rows) &&
    rows.length > 0 &&
    mappedSeriesData.totalCount > 0 &&
    mappedSeriesData.matchedCount === 0
      ? "Map labels do not match geometry names for selected country."
      : "";
  const metricLabel = GEO_METRIC_LABELS[metric] || "Revenue";
  const drilldownHelperText =
    level === "state" || level === "city"
      ? "Click a state on map to switch state, or use Top Regions table to drill into city."
      : "Click a region to drill down to the next level.";

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-md sm:p-5">
      <div className="mb-3 flex items-center justify-end">
        <p className="text-xs text-slate-400">{drilldownHelperText}</p>
      </div>
      {nameMismatchWarning && (
        <p className="mb-2 text-xs text-amber-300/85">{nameMismatchWarning}</p>
      )}

      <div className="h-[560px] w-full border border-white/10 bg-[#020617]/80">
        {showLoading && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Loading map analytics...
          </div>
        )}

        {!showLoading && showError && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-rose-300">
            {showError}
          </div>
        )}

        {!showLoading && !showError && (
          <ReactEChartsCore
            echarts={echarts}
            option={chartOption}
            onEvents={onEvents}
            notMerge
            lazyUpdate
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>{metricLabel} heat scale</span>
        <span>
          Low: {formatMetricValue(metric, valueRange.min)} | High:{" "}
          {formatMetricValue(metric, valueRange.max)}
        </span>
      </div>
    </section>
  );
};

export default GeoHeatMapPanel;
