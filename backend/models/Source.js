const mongoose = require("mongoose");
// Data model layer: logical data source metadata used by ingestion and analytics.

const sourceSchema = new mongoose.Schema(
  {
    sourceName: {
      type: String,
      required: true,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ["sales", "inventory", "customer", "custom"],
      required: true,
      default: "custom",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

sourceSchema.index({ sourceName: 1, sourceType: 1 }, { unique: true });

module.exports = mongoose.model("Source", sourceSchema);
