const express = require("express");
const {
  getCsvSummary,
  getCsvBatchInsights
} = require("../controllers/csvAnalyticsController");

const router = express.Router();

router.get("/csv/summary", getCsvSummary);
router.get("/csv/batch-insights", getCsvBatchInsights);

module.exports = router;
