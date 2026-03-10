// Analytics layer: aggregates BusinessRecord data while staying independent from ingestion/parsing logic.
const BusinessRecord = require("../models/BusinessRecord");

async function getCsvAnalyticsSummary(match = {}) {
  const baseMatch = {
    ...match,
    isActive: true,
  };

  const pipeline = [
    { $match: baseMatch },
    {
      $lookup: {
        from: "datasets",
        localField: "datasetId",
        foreignField: "_id",
        as: "dataset",
      },
    },
    { $unwind: "$dataset" },
    { $match: { "dataset.isActive": true } },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        totalRevenueRaw: { $sum: { $ifNull: ["$revenue", 0] } },
        revenueRows: {
          $sum: { $cond: [{ $ne: ["$revenue", null] }, 1, 0] },
        },
        totalUnitsRaw: { $sum: { $ifNull: ["$quantity", 0] } },
        quantityRows: {
          $sum: { $cond: [{ $ne: ["$quantity", null] }, 1, 0] },
        },
        customers: {
          $addToSet: {
            $cond: [
              { $and: [{ $ne: ["$customer", null] }, { $ne: ["$customer", ""] }] },
              "$customer",
              "$$REMOVE",
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalRecords: 1,
        totalRevenue: {
          $cond: [{ $gt: ["$revenueRows", 0] }, { $round: ["$totalRevenueRaw", 2] }, null],
        },
        totalUnits: {
          $cond: [{ $gt: ["$quantityRows", 0] }, { $round: ["$totalUnitsRaw", 2] }, null],
        },
        uniqueCustomers: { $size: "$customers" },
        totalCustomers: { $size: "$customers" },
        hasRevenue: { $gt: ["$revenueRows", 0] },
        hasQuantity: { $gt: ["$quantityRows", 0] },
        hasCustomer: { $gt: [{ $size: "$customers" }, 0] },
      },
    },
  ];

  const result = await BusinessRecord.aggregate(pipeline);
  if (!result.length) {
    return {
      totalRecords: 0,
      totalRevenue: null,
      totalUnits: null,
      uniqueCustomers: 0,
      totalCustomers: 0,
      hasRevenue: false,
      hasQuantity: false,
      hasCustomer: false,
    };
  }

  return result[0];
}

module.exports = {
  getCsvAnalyticsSummary,
};
