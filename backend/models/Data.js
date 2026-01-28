const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema(
  {
    // 🔹 Core analytical fields (used in charts & tables)
    title: {
      type: String,
      required: true
    },

    value: {
      type: Number,
      required: true
    },

    // 🔹 Metadata (industry-level)
    source: {
      type: String,
      enum: ["csv", "database", "api"],
      default: "csv"
    },

    batchId: {
      type: String,
      required: true,
      index: true
    },

    uploadedAt: {
      type: Date,
      default: Date.now
    },

    // 🔹 Versioning fields
    version: {
      type: Number,
      default: 1
    },

    isActive: {
      type: Boolean,
      default: true
    },

    // 🔹 Flexible storage for extra CSV columns
    // Stores the COMPLETE original row
    rawData: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true // adds createdAt & updatedAt automatically
  }
);

module.exports = mongoose.model("Data", dataSchema);
