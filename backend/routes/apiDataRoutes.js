const express = require("express");
const router = express.Router();

const { fetchApiData } = require("../controllers/apiDataController");
const {
  getApiSummary,
  getApiBatchInsights
} = require("../controllers/apiAnalyticsController");

const ApiData = require("../models/ApiData");
const logActivity = require("../utils/logActivity");

router.post("/api-data/fetch", fetchApiData);

router.get("/api-data/summary", getApiSummary);
router.get("/api-data/batch-insights", getApiBatchInsights);

router.get("/api-data/all", async (req, res) => {
  const data = await ApiData.find().sort({ fetchedAt: -1 });
  res.json(data);
});

router.get("/api-data/batches", async (req, res) => {
  const batches = await ApiData.aggregate([
    { $group: { _id: "$batchId", fetchedAt: { $max: "$fetchedAt" } } },
    { $sort: { fetchedAt: -1 } }
  ]);
  res.json(batches);
});

router.get("/api-data/batch/:batchId", async (req, res) => {
  const data = await ApiData.find({ batchId: req.params.batchId });
  res.json(data);
});

router.delete("/api-data/batch/:batchId", async (req, res) => {
  await ApiData.deleteMany({ batchId: req.params.batchId });
  await logActivity(
    req.userId ? "User" : "System",
    "API Batch Deleted",
    "API Data",
    `Deleted batch ${req.params.batchId}`,
    "warning",
    req
  );
  res.json({ message: "Batch deleted" });
});

module.exports = router;
