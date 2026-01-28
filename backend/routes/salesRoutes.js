// routes/salesRoutes.js
const express = require("express");
const {
  getSalesData,
  getTotalRevenue,
  getSalesInsights
} = require("../controllers/salesController");

const {
  updateSalesRecord,
  getSalesHistory,
  rollbackSalesRecord,
  getSalesBatchVersions,
  deleteSalesRecord
} = require("../controllers/salesVersioningController");

const Sales = require("../models/Sales");

const router = express.Router();

router.get("/sales", getSalesData);
router.get("/sales/total-revenue", getTotalRevenue);
router.get("/sales/insights", getSalesInsights);

// Versioning routes for sales data
router.put("/sales/:id", updateSalesRecord);
router.get("/sales/:id/history", getSalesHistory);
router.post("/sales/:id/rollback/:version", rollbackSalesRecord);
router.get("/sales/batch/:batchId/versions", getSalesBatchVersions);
router.delete("/sales/:id", deleteSalesRecord);

module.exports = router;
