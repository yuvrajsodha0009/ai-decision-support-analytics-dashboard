const Sales = require("../models/Sales");

// GET all sales
const getSalesData = async (req, res) => {
  try {
    const sales = await Sales.find({ isActive: true });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET total revenue
const getTotalRevenue = async (req, res) => {
  try {
    const result = await Sales.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: "$revenue" } } }
    ]);
    res.json({ totalRevenue: result[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DSS: Sales Insights
const getSalesInsights = async (req, res) => {
  try {
    const sales = await Sales.find({ isActive: true });

    if (sales.length === 0) {
      return res.json({
        message: "No sales data available"
      });
    }

    const revenueMap = {};
    sales.forEach(s => {
      revenueMap[s.product] =
        (revenueMap[s.product] || 0) + s.revenue;
    });

    const sorted = Object.entries(revenueMap).sort(
      (a, b) => b[1] - a[1]
    );

    res.json({
      bestProduct: sorted[0][0],
      worstProduct: sorted[sorted.length - 1][0],
      recommendation:
        "Increase inventory and promotion for high-performing products"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  getSalesData,
  getTotalRevenue,
  getSalesInsights
};
