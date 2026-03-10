const mongoose = require("mongoose");
// Data model layer: dataset metadata per uploaded file and applied field mapping.

const columnMetadataSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    detectedType: {
      type: String,
      enum: ["number", "date", "string"],
      default: "string",
    },
    mappedTo: {
      type: String,
      default: null,
    },
    isNumeric: {
      type: Boolean,
      default: false,
    },
    isCategorical: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const datasetSchema = new mongoose.Schema(
  {
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Source",
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalColumns: {
      type: [String],
      default: [],
    },
    mappedFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    recordCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    columnsMetadata: {
      type: [columnMetadataSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
  }
);

datasetSchema.index({ sourceId: 1, uploadDate: -1 });

module.exports = mongoose.model("Dataset", datasetSchema);
