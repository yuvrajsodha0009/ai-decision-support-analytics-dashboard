const express = require("express");
const Data = require("../models/Data");

const router = express.Router();

/*
    SUMMARY API (DSS CORE)
    GET /api/analytics/summary
 */
router.get("/summary", async (req, res) => {
  try {
    const data = await Data.find();

    const totalRevenue = data.reduce((sum, d) => sum + d.value, 0);
    const totalRecords = data.length;

    const productRevenue = {};
    data.forEach(d => {
      productRevenue[d.title] = (productRevenue[d.title] || 0) + d.value;
    });

    const sorted = Object.entries(productRevenue).sort(
      (a, b) => b[1] - a[1]
    );

    res.json({
      totalRevenue,
      totalRecords,
      bestProduct: sorted[0]?.[0] || null,
      worstProduct: sorted[sorted.length - 1]?.[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: "Summary analytics failed" });
  }
});
/**
 * ============================
 * GET /api/analytics/product-wise
 * ============================
 */
router.get("/product-wise", async (req, res) => {
  try {
    const data = await Data.find();

    const result = {};
    data.forEach(item => {
      result[item.title] = (result[item.title] || 0) + item.value;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Product analytics failed" });
  }
});
/**
 * ============================
 * GET /api/analytics/insights
 * ============================
 */
router.get("/insights", async (req, res) => {
  try {
    const batches = await Data.aggregate([
      {
        $group: {
          _id: "$batchId",
          revenue: { $sum: "$value" },
          uploadedAt: { $max: "$uploadedAt" }
        }
      },
      { $sort: { uploadedAt: 1 } }
    ]);

    let trend = "Stable";

    if (batches.length >= 2) {
      const last = batches[batches.length - 1].revenue;
      const prev = batches[batches.length - 2].revenue;

      if (last > prev) trend = "Increasing";
      else if (last < prev) trend = "Decreasing";
    }

    res.json({
      batches,
      trend,
      recommendation:
        trend === "Increasing"
          ? "Continue current sales strategy"
          : "Review pricing, promotion, or product mix"
    });
  } catch (err) {
    res.status(500).json({ error: "Insight analysis failed" });
  }
});

module.exports = router;

