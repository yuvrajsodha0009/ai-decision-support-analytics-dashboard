const KPI = require("../models/KPI");
const Data = require("../models/Data");
const ApiData = require("../models/ApiData");
const Sales = require("../models/Sales");

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

      if (kpi.source === "csv") {
        Model = Data;
        if (kpi.batchId) query.batchId = kpi.batchId;
      }

      if (kpi.source === "api") {
        Model = ApiData;
        if (kpi.batchId) query.batchId = kpi.batchId;
      }

      if (kpi.source === "database") {
        Model = Sales;
      }

      const docs = await Model.find(query);

      let values = [];
      if (kpi.operation !== "COUNT") {
        values = docs.map(d => {
          const num = Number(d[kpi.field]);
          return isNaN(num) ? 0 : num;
        });
      }

      let value = 0;

      switch (kpi.operation) {
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

    await KPI.findOneAndDelete({
      _id: id,
      createdBy: req.userId
    });

    res.json({ message: "KPI deleted successfully" });
  } catch (error) {
    console.error("Delete KPI Error:", error);
    res.status(500).json({ message: "Failed to delete KPI", error: error.message });
  }
};
