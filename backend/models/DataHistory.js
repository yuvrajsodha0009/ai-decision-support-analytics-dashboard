const mongoose = require("mongoose");

const dataHistorySchema = new mongoose.Schema(
  {
    dataId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Data",
      required: true
    },
    version: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    source: {
      type: String,
      enum: ["csv", "database", "api"],
      default: "csv"
    },
    batchId: {
      type: String,
      required: true
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed
    },
    changedBy: {
      type: String, // user ID or name
      default: "system"
    },
    changeType: {
      type: String,
      enum: ["create", "update", "delete"],
      required: true
    },
    changeReason: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying
dataHistorySchema.index({ dataId: 1, version: 1 });

module.exports = mongoose.model("DataHistory", dataHistorySchema);