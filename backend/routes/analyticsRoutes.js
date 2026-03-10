const express = require("express");
const auth = require("../middleware/authMiddleware");
const {
  getAnalytics,
  getAnalyticsSummary,
  getAnalyticsByCategory,
  getAnalyticsByRegion,
  getAnalyticsByDevice,
  getAnalyticsFilterOptions,
} = require("../controllers/analyticsController");
const {
  getGeoSummary,
  getGeoMap,
  getGeoTopRegions,
  getGeoRevenueTrend,
  getGeoRegionBar,
  getGeoCategoryHeatmap,
  getGeoInsights,
  getGeoFilterOptions,
} = require("../controllers/geoAnalyticsController");

const router = express.Router();

router.use(auth);

router.get("/", getAnalytics);
router.get("/summary", getAnalyticsSummary);
router.get("/by-category", getAnalyticsByCategory);
router.get("/by-region", getAnalyticsByRegion);
router.get("/by-device", getAnalyticsByDevice);
router.get("/filter-options", getAnalyticsFilterOptions);

router.get("/geo/summary", getGeoSummary);
router.get("/geo/map", getGeoMap);
router.get("/geo/top-regions", getGeoTopRegions);
router.get("/geo/revenue-trend", getGeoRevenueTrend);
router.get("/geo/region-bar", getGeoRegionBar);
router.get("/geo/category-heatmap", getGeoCategoryHeatmap);
router.get("/geo/insights", getGeoInsights);
router.get("/geo/filter-options", getGeoFilterOptions);

module.exports = router;
