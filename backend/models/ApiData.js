const mongoose = require("mongoose");

const apiDataSchema = new mongoose.Schema(
  {
    title: String,
    value: Number,

    source: { type: String, default: "api" },
    region: { type: String, default: "unknown" },
    channel: { type: String, default: "api" },

    batchId: { type: String, required: true, index: true },

    fetchedAt: { type: Date, default: Date.now },

    version: { type: Number, default: 1 },

    isActive: { type: Boolean, default: true },

    rawData: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

module.exports = mongoose.model("ApiData", apiDataSchema);
