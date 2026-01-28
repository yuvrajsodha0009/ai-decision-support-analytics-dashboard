const Sales = require("../models/Sales");
const SalesHistory = require("../models/SalesHistory");

/**
 * Update a sales record with versioning
 */
exports.updateSalesRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, product, quantity, revenue, changeReason, changedBy } = req.body;

    // Find the current record
    const currentRecord = await Sales.findById(id);
    if (!currentRecord) {
      return res.status(404).json({ message: "Sales record not found" });
    }

    // Save current state to history
    const historyEntry = new SalesHistory({
      salesId: id,
      version: currentRecord.version,
      date: currentRecord.date,
      product: currentRecord.product,
      quantity: currentRecord.quantity,
      revenue: currentRecord.revenue,
      batchId: currentRecord.batchId,
      source: currentRecord.source,
      changedBy: changedBy || "system",
      changeType: "update",
      changeReason: changeReason || "Record updated"
    });
    await historyEntry.save();

    // Update the record with new version
    const updatedRecord = await Sales.findByIdAndUpdate(
      id,
      {
        date: date !== undefined ? new Date(date) : currentRecord.date,
        product: product !== undefined ? product : currentRecord.product,
        quantity: quantity !== undefined ? quantity : currentRecord.quantity,
        revenue: revenue !== undefined ? revenue : currentRecord.revenue,
        version: currentRecord.version + 1,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      message: "Sales record updated successfully",
      data: updatedRecord,
      previousVersion: currentRecord.version
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get version history for a sales record
 */
exports.getSalesHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await SalesHistory.find({ salesId: id }).sort({ version: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Rollback a sales record to a specific version
 */
exports.rollbackSalesRecord = async (req, res) => {
  try {
    const { id, version } = req.params;

    // Find the history entry for the specified version
    const historyEntry = await SalesHistory.findOne({ salesId: id, version: parseInt(version) });
    if (!historyEntry) {
      return res.status(404).json({ message: "Version not found" });
    }

    // Update the current record to match the history entry
    const updatedRecord = await Sales.findByIdAndUpdate(
      id,
      {
        date: historyEntry.date,
        product: historyEntry.product,
        quantity: historyEntry.quantity,
        revenue: historyEntry.revenue,
        version: historyEntry.version,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      message: "Record rolled back successfully",
      data: updatedRecord
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all versions for a sales batch
 */
exports.getSalesBatchVersions = async (req, res) => {
  try {
    const { batchId } = req.params;
    const versions = await SalesHistory.aggregate([
      { $match: { batchId } },
      {
        $group: {
          _id: "$version",
          records: { $push: "$$ROOT" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": -1 } }
    ]);
    res.json(versions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Soft delete a sales record
 */
exports.deleteSalesRecord = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the current record
    const currentRecord = await Sales.findById(id);
    if (!currentRecord) {
      return res.status(404).json({ message: "Sales record not found" });
    }

    // Save to history before deleting
    const historyEntry = new SalesHistory({
      salesId: id,
      version: currentRecord.version,
      date: currentRecord.date,
      product: currentRecord.product,
      quantity: currentRecord.quantity,
      revenue: currentRecord.revenue,
      batchId: currentRecord.batchId,
      source: currentRecord.source,
      changedBy: "system",
      changeType: "delete",
      changeReason: "Record soft deleted"
    });
    await historyEntry.save();

    // Soft delete
    await Sales.findByIdAndUpdate(id, { isActive: false });

    res.json({ message: "Sales record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};