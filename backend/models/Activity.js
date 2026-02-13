const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    user: { type: String, default: "System" },
    userRole: { type: String, default: "" },
    action: { type: String, required: true },
    resource: { type: String, default: "" },
    details: { type: String, default: "" },
    status: {
      type: String,
      enum: ["success", "warning", "error"],
      default: "success",
    },
    timestamp: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: false }
);

activitySchema.index({ timestamp: -1 });

module.exports = mongoose.model("Activity", activitySchema);
