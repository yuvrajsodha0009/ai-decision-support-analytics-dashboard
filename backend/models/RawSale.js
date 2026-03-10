const mongoose = require("mongoose");

const rawSaleSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    product: {
      productId: {
        type: String,
        required: true,
        trim: true
      },
      productName: {
        type: String,
        required: true,
        trim: true
      },
      category: {
        type: String,
        required: true,
        trim: true
      },
      subcategory: {
        type: String,
        default: "unknown",
        trim: true
      },
      brand: {
        type: String,
        default: "unknown",
        trim: true
      }
    },
    customer: {
      customerId: {
        type: String,
        required: true,
        trim: true
      },
      customerType: {
        type: String,
        required: true,
        enum: ["new", "returning"]
      }
    },
    geography: {
      region: {
        type: String,
        required: true,
        trim: true
      },
      country: {
        type: String,
        required: true,
        trim: true
      },
      state: {
        type: String,
        default: "unknown",
        trim: true
      },
      city: {
        type: String,
        default: "unknown",
        trim: true
      }
    },
    marketing: {
      trafficSource: {
        type: String,
        required: true,
        trim: true
      },
      campaignId: {
        type: String,
        default: "none",
        trim: true
      },
      deviceType: {
        type: String,
        required: true,
        enum: ["mobile", "desktop", "tablet"]
      }
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0
    },
    // Derived in pre-save so analytical reads do not re-compute these values.
    revenue: {
      type: Number,
      default: 0
    },
    profit: {
      type: Number,
      default: 0
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ["completed", "pending", "cancelled", "returned"]
    },
    isTestData: {
      type: Boolean,
      default: false,
      index: true
    },
    // UTC time dimensions for fast OLAP-style grouping without runtime date extraction.
    year: {
      type: Number,
      index: true
    },
    month: {
      type: Number,
      min: 1,
      max: 12,
      index: true
    },
    day: {
      type: Number,
      min: 1,
      max: 31,
      index: true
    },
    hour: {
      type: Number,
      min: 0,
      max: 23,
      index: true
    },
    quarter: {
      type: Number,
      min: 1,
      max: 4,
      index: true
    }
  },
  {
    timestamps: true
  }
);

rawSaleSchema.pre("save", function saveDerivedFields(next) {
  const quantity = Number(this.quantity) || 0;
  const price = Number(this.price) || 0;
  const cost = Number(this.cost) || 0;
  const discountAmount = Number(this.discountAmount) || 0;
  const shippingCost = Number(this.shippingCost) || 0;

  // Non-completed orders should not contribute to booked revenue/profit metrics.
  if (this.orderStatus === "completed") {
    this.revenue = quantity * price - discountAmount;
    this.profit = this.revenue - quantity * cost - shippingCost;
  } else {
    this.revenue = 0;
    this.profit = 0;
  }

  const eventTime = this.timestamp instanceof Date ? this.timestamp : new Date(this.timestamp);
  const safeTimestamp = Number.isNaN(eventTime.getTime()) ? new Date() : eventTime;

  // Persist UTC date parts so time-based analytics avoid runtime date extraction.
  this.year = safeTimestamp.getUTCFullYear();
  this.month = safeTimestamp.getUTCMonth() + 1;
  this.day = safeTimestamp.getUTCDate();
  this.hour = safeTimestamp.getUTCHours();
  this.quarter = Math.floor((this.month - 1) / 3) + 1;

  next();
});

rawSaleSchema.index({ timestamp: 1 });
rawSaleSchema.index({ "geography.region": 1 });
rawSaleSchema.index({ "geography.country": 1 });
rawSaleSchema.index({ "geography.state": 1 });
rawSaleSchema.index({ "product.category": 1 });
rawSaleSchema.index({ "product.subcategory": 1 });
rawSaleSchema.index({ "marketing.deviceType": 1 });
rawSaleSchema.index({ orderStatus: 1 });

// Additional composite indexes for high-cardinality analytic queries.
rawSaleSchema.index({ year: 1, month: 1, day: 1, hour: 1 });
rawSaleSchema.index({
  "geography.region": 1,
  "product.category": 1,
  "marketing.deviceType": 1,
  timestamp: -1
});
rawSaleSchema.index({ "product.subcategory": 1, timestamp: -1 });
rawSaleSchema.index({ "marketing.trafficSource": 1, timestamp: -1 });
rawSaleSchema.index({
  "customer.customerId": 1,
  orderStatus: 1,
  timestamp: -1
});

module.exports = mongoose.model("RawSale", rawSaleSchema);
