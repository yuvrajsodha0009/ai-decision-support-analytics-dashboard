const Data = require("../models/Data");

// ============================
// CSV SUMMARY (DSS CARD)
// ============================
exports.getCsvSummary = async (req, res) => {
  try {
    const data = await Data.find({ isActive: true });

    const totalValue = data.reduce((sum, d) => sum + (d.value || 0), 0);

    const categoryMap = {};
    data.forEach(d => {
      categoryMap[d.title] = (categoryMap[d.title] || 0) + d.value;
    });

    const sorted = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    res.json({
      totalValue,
      totalRecords: data.length,
      bestCategory: sorted[0]?.[0] || null,
      worstCategory: sorted[sorted.length - 1]?.[0] || null
    });
  } catch (err) {
    res.status(500).json({ message: "CSV summary failed", error: err.message });
  }
};

// ============================
// CSV BATCH INSIGHTS (GRAPH)
// ============================
exports.getCsvBatchInsights = async (req, res) => {
  try {
    const batches = await Data.aggregate([
      {
        $group: {
          _id: "$batchId",
          totalValue: { $sum: "$value" },
          uploadedAt: { $max: "$uploadedAt" }
        }
      },
      { $sort: { uploadedAt: 1 } }
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
          ? "CSV data performance is improving"
          : "Review uploaded CSV data"
    });
  } catch (err) {
    res.status(500).json({ message: "Batch insights failed", error: err.message });
  }
};
