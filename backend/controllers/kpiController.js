const KPI = require("../models/KPI");
const Data = require("../models/Data");
const ApiData = require("../models/ApiData");
const RawSale = require("../models/RawSale");
const logActivity = require("../utils/logActivity");

function numericExpr(path) {
  return {
    $convert: {
      input: path,
      to: "double",
      onError: null,
      onNull: null,
    },
  };
}

const revenueExpr = {
  $ifNull: [
    numericExpr("$pricing.total"),
    {
      $ifNull: [
        numericExpr("$revenue"),
        {
          $multiply: [
            { $ifNull: [numericExpr("$price"), 0] },
            { $ifNull: [numericExpr("$quantity"), 0] },
          ],
        },
      ],
    },
  ],
};

const quantityExpr = { $ifNull: [numericExpr("$quantity"), 0] };

/* ================= CREATE KPI ================= */
exports.createKPI = async (req, res) => {
  try {
    const { name, source, field, operation, batchId } = req.body;

    const kpi = await KPI.create({
      name,
      source,
      field,
      operation,
      batchId: source === "database" || batchId === "ALL" ? null : batchId,
      createdBy: req.userId
    });

    await logActivity(
      req.userId ? "User" : "System",
      "KPI Created",
      "KPI",
      `Created KPI "${name}" (${operation} on ${field})`,
      "success",
      req
    );

    res.json(kpi);
  } catch (error) {
    console.error("Create KPI Error:", error);
    res.status(500).json({ message: "Failed to create KPI", error: error.message });
  }
};

/* ================= COMPUTE KPIs ================= */
exports.computeKPIs = async (req, res) => {
  try {
    const kpis = await KPI.find({ createdBy: req.userId });
    const results = [];

    for (const kpi of kpis) {
      let Model;
      let query = {};
      let value = 0;
      const operation = String(kpi.operation || "").toUpperCase();

      if (kpi.source === "csv") {
        Model = Data;
        if (kpi.batchId) query.batchId = kpi.batchId;
      }

      if (kpi.source === "api") {
        Model = ApiData;
        if (kpi.batchId) query.batchId = kpi.batchId;
      }

      if (kpi.source === "database") {
        const normalizedField = String(kpi.field || "").toLowerCase();
        if (normalizedField !== "quantity" && normalizedField !== "revenue") {
          return res.status(400).json({
            message: `Unsupported rawsales field: ${kpi.field}`,
          });
        }

        const metricExpr = normalizedField === "quantity" ? quantityExpr : revenueExpr;
        const match = { orderStatus: "completed" };

        if (operation === "COUNT") {
          value = await RawSale.countDocuments(match);
        } else {
          const accumulatorByOperation = {
            SUM: { $sum: metricExpr },
            AVG: { $avg: metricExpr },
            MIN: { $min: metricExpr },
            MAX: { $max: metricExpr },
          };
          const accumulator = accumulatorByOperation[operation];
          if (!accumulator) {
            return res.status(400).json({
              message: `Unsupported operation for rawsales: ${kpi.operation}`,
            });
          }

          const aggregated = await RawSale.aggregate([
            { $match: match },
            {
              $group: {
                _id: null,
                value: accumulator,
              },
            },
          ]);

          value = Number(aggregated[0]?.value || 0);
        }
      } else {
        if (!Model) {
          return res.status(400).json({
            message: `Unsupported KPI source: ${kpi.source}`,
          });
        }

        const docs = await Model.find(query);
        const values = docs.map((d) => {
          const num = Number(d[kpi.field]);
          return Number.isNaN(num) ? 0 : num;
        });

        switch (operation) {
          case "SUM":
            value = values.reduce((a, b) => a + b, 0);
            break;
          case "AVG":
            value = values.length
              ? values.reduce((a, b) => a + b, 0) / values.length
              : 0;
            break;
          case "MIN":
            value = values.length ? Math.min(...values) : 0;
            break;
          case "MAX":
            value = values.length ? Math.max(...values) : 0;
            break;
          case "COUNT":
            value = docs.length;
            break;
          default:
            value = 0;
            break;
        }
      }

      results.push({
        _id: kpi._id,
        name: kpi.name,
        source: kpi.source,
        field: kpi.field,
        operation: kpi.operation,
        batchId: kpi.batchId,
        value
      });
    }

    res.json(results);
  } catch (error) {
    console.error("Compute KPIs Error:", error);
    res.status(500).json({ message: "Failed to compute KPIs", error: error.message });
  }
};

/* ================= FETCH BATCH DROPDOWN ================= */
exports.getBatchIds = async (req, res) => {
  try {
    const { source } = req.query;
    let Model;

    if (source === "csv") Model = Data;
    if (source === "api") Model = ApiData;

    if (!Model) {
      return res.json([{ label: "All Batches", value: "ALL" }]);
    }

    const batches = await Model.aggregate([
      {
        $group: {
          _id: "$batchId",
          date: { $first: "$createdAt" }
        }
      },
      { $sort: { date: -1 } }
    ]);

    const formatted = [
      { label: "All Batches", value: "ALL" },
      ...batches
        .filter(b => b._id)
        .map(b => ({
          label: new Date(b.date).toLocaleString("en-IN"),
          value: b._id
        }))
    ];

    res.json(formatted);
  } catch (error) {
    console.error("Get Batch IDs Error:", error);
    res.status(500).json({ message: "Failed to fetch batches", error: error.message });
  }
};

/* ================= DELETE KPI ================= */
exports.deleteKPI = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await KPI.findOneAndDelete({
      _id: id,
      createdBy: req.userId
    });

    if (deleted) {
      await logActivity(
        req.userId ? "User" : "System",
        "KPI Deleted",
        "KPI",
        `Deleted KPI "${deleted.name}"`,
        "warning",
        req
      );
    }

    res.json({ message: "KPI deleted successfully" });
  } catch (error) {
    console.error("Delete KPI Error:", error);
    res.status(500).json({ message: "Failed to delete KPI", error: error.message });
  }
};
