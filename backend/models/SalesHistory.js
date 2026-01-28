const mongoose = require("mongoose");

const salesHistorySchema = new mongoose.Schema(
  {
    salesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sales",
      required: true
    },
    version: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    product: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    revenue: {
      type: Number,
      required: true
    },
    batchId: {
      type: String,
      default: "default"
    },
    source: {
      type: String,
      default: "database"
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

module.exports = mongoose.model("SalesHistory", salesHistorySchema);