const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema(
  {
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

    // 🔹 NEW (derived but realistic)
    price: {
      type: Number,
      default: 0
    },

    revenue: {
      type: Number,
      required: true
    },

    // 🔹 NEW business dimensions
    region: {
      type: String,
      default: "unknown"
    },

    channel: {
      type: String,
      default: "direct"
    },

    // 🔹 Existing fields (unchanged)
    version: {
      type: Number,
      default: 1
    },

    isActive: {
      type: Boolean,
      default: true
    },

    batchId: {
      type: String,
      default: "default"
    },

    source: {
      type: String,
      default: "database"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sales", salesSchema);
