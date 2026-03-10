const mongoose = require("mongoose");
// Data model layer: flexible normalized business records with dynamic fields.

const businessRecordSchema = new mongoose.Schema(
  {
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Source",
      required: true,
      index: true,
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dataset",
      required: true,
    },
    date: {
      type: Date,
      default: null,
    },
    revenue: {
      type: Number,
      default: null,
    },
    quantity: {
      type: Number,
      default: null,
    },
    product: {
      type: String,
      default: null,
      trim: true,
    },
    customer: {
      type: String,
      default: null,
      trim: true,
    },
    region: {
      type: String,
      default: null,
      trim: true,
    },
    extraFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    rowHash: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
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

businessRecordSchema.index({ sourceId: 1, datasetId: 1, uploadedAt: -1 });
businessRecordSchema.index({ datasetId: 1 });
businessRecordSchema.index({ datasetId: 1, rowHash: 1 }, { unique: true });

module.exports = mongoose.model("BusinessRecord", businessRecordSchema);
