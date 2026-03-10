const mongoose = require("mongoose");
// Data model layer: reusable mapping templates for recurring header sets per source.

const mappingTemplateSchema = new mongoose.Schema(
  {
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Source",
      required: true,
      index: true,
    },
    originalColumns: {
      type: [String],
      default: [],
    },
    mappedFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    headerSignature: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

mappingTemplateSchema.index({ sourceId: 1, headerSignature: 1 }, { unique: true });

module.exports = mongoose.model("MappingTemplate", mappingTemplateSchema);
