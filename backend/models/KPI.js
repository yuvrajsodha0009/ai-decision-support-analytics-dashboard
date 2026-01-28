const mongoose = require("mongoose");

const kpiSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    source: {
      type: String,
      enum: ["csv", "api", "database"],
      required: true
    },

    field: {
      type: String,
      required: true
    },

    operation: {
      type: String,
      enum: ["SUM", "AVG", "MIN", "MAX", "COUNT"],
      required: true
    },

    batchId: {
      type: String,
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("KPI", kpiSchema);
