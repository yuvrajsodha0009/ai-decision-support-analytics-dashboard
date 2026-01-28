const ApiData = require("../models/ApiData");

// ============================
// SUMMARY (DSS CARD)
// ============================
exports.getApiSummary = async (req, res) => {
  try {
    const data = await ApiData.find({});

    const totalValue = data.reduce(
      (sum, d) => sum + (d.value || 0),
      0
    );

    res.json({
      totalValue,
      totalRecords: data.length,
      totalBatches: new Set(data.map(d => d.batchId)).size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================
// BATCH INSIGHTS (GRAPH)
// ============================
exports.getApiBatchInsights = async (req, res) => {
  try {
    const batches = await ApiData.aggregate([
      {
        $group: {
          _id: "$batchId",
          totalValue: { $sum: "$value" },
          fetchedAt: { $max: "$fetchedAt" }
        }
      },
      { $sort: { fetchedAt: 1 } }
    ]);

    let trend = "Stable";
    if (batches.length >= 2) {
      trend =
        batches[batches.length - 1].totalValue >
        batches[batches.length - 2].totalValue
          ? "Increasing"
          : "Decreasing";
    }

    res.json({
      batches,
      trend,
      recommendation:
        trend === "Increasing"
          ? "API metrics improving"
          : "Review API-based metrics"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
