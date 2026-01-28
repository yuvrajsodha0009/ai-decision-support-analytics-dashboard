const mongoose = require("mongoose");

const apiDataHistorySchema = new mongoose.Schema(
  {
    apiDataId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiData",
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
      default: "api"
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

module.exports = mongoose.model("ApiDataHistory", apiDataHistorySchema);