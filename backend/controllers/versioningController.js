const Data = require("../models/Data");
const DataHistory = require("../models/DataHistory");

/**
 * Update a data record with versioning
 */
exports.updateDataRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, value, rawData, changeReason, changedBy } = req.body;

    // Find the current record
    const currentRecord = await Data.findById(id);
    if (!currentRecord) {
      return res.status(404).json({ message: "Data record not found" });
    }

    // Save current state to history
    const historyEntry = new DataHistory({
      dataId: id,
      version: currentRecord.version,
      title: currentRecord.title,
      value: currentRecord.value,
      source: currentRecord.source,
      batchId: currentRecord.batchId,
      rawData: currentRecord.rawData,
      changedBy: changedBy || "system",
      changeType: "update",
      changeReason: changeReason || "Record updated"
    });
    await historyEntry.save();

    // Update the record with new version
    const updatedRecord = await Data.findByIdAndUpdate(
      id,
      {
        title: title !== undefined ? title : currentRecord.title,
        value: value !== undefined ? value : currentRecord.value,
        rawData: rawData !== undefined ? rawData : currentRecord.rawData,
        version: currentRecord.version + 1,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      message: "Data record updated successfully",
      data: updatedRecord,
      previousVersion: currentRecord.version
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update data record", error: error.message });
  }
};

/**
 * Get version history for a data record
 */
exports.getDataHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await DataHistory.find({ dataId: id }).sort({ version: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve data history", error: error.message });
  }
};

/**
 * Rollback a data record to a specific version
 */
exports.rollbackDataRecord = async (req, res) => {
  try {
    const { id, version } = req.params;
    const { changeReason, changedBy } = req.body;

    // Find the history entry for the specified version
    const historyEntry = await DataHistory.findOne({ dataId: id, version: parseInt(version) });
    if (!historyEntry) {
      return res.status(404).json({ message: "Version not found" });
    }

    // Get current record
    const currentRecord = await Data.findById(id);
    if (!currentRecord) {
      return res.status(404).json({ message: "Data record not found" });
    }

    // Save current state to history before rollback
    const rollbackHistory = new DataHistory({
      dataId: id,
      version: currentRecord.version,
      title: currentRecord.title,
      value: currentRecord.value,
      source: currentRecord.source,
      batchId: currentRecord.batchId,
      rawData: currentRecord.rawData,
      changedBy: changedBy || "system",
      changeType: "update",
      changeReason: `Rolled back to version ${version}: ${changeReason || "Rollback performed"}`
    });
    await rollbackHistory.save();

    // Update the record to the historical version
    const rolledBackRecord = await Data.findByIdAndUpdate(
      id,
      {
        title: historyEntry.title,
        value: historyEntry.value,
        rawData: historyEntry.rawData,
        version: currentRecord.version + 1,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      message: `Data record rolled back to version ${version}`,
      data: rolledBackRecord
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to rollback data record", error: error.message });
  }
};

/**
 * Get all versions for a batch/dataset
 */
exports.getBatchVersions = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Get all records in the batch
    const records = await Data.find({ batchId, isActive: true });

    // Get version history for each record
    const batchHistory = [];
    for (const record of records) {
      const history = await DataHistory.find({ dataId: record._id }).sort({ version: -1 });
      batchHistory.push({
        recordId: record._id,
        current: record,
        history: history
      });
    }

    res.json({
      batchId,
      records: batchHistory
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve batch versions", error: error.message });
  }
};

/**
 * Soft delete a data record (mark as inactive)
 */
exports.deleteDataRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { changeReason, changedBy } = req.body;

    const record = await Data.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Data record not found" });
    }

    // Save to history before deletion
    const historyEntry = new DataHistory({
      dataId: id,
      version: record.version,
      title: record.title,
      value: record.value,
      source: record.source,
      batchId: record.batchId,
      rawData: record.rawData,
      changedBy: changedBy || "system",
      changeType: "delete",
      changeReason: changeReason || "Record deleted"
    });
    await historyEntry.save();

    // Soft delete
    await Data.findByIdAndUpdate(id, { isActive: false });

    res.json({ message: "Data record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete data record", error: error.message });
  }
};